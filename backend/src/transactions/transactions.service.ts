/**
 * Service do domínio de transações financeiras; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  CreateTransactionDto,
  TransactionType,
} from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '@prisma/client';
import { EncryptionService } from '../common/services/encryption.service';
import {
  encryptAmount,
  decryptAmount,
  atomicBalanceUpdate,
} from '../common/services/balance-helper';

type AccountRow = {
  id: string;
  userId: string;
  balance: string;
  deletedAt: Date | null;
};

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private encryption: EncryptionService,
  ) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const amount = Number(createTransactionDto.amount);
    const date = new Date(createTransactionDto.date);
    if (date > new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)) {
      throw new BadRequestException(
        'Data não pode ser mais que 2 dias no futuro',
      );
    }

    // TRANSFER type must go through the dedicated /transfer endpoint
    if (createTransactionDto.type === TransactionType.TRANSFER) {
      throw new BadRequestException(
        'Use o endpoint de transferência para criar transferências',
      );
    }

    const { type, accountId, categoryId, creditCardId } = createTransactionDto;

    // Validate FK ownership: accountId, categoryId, creditCardId must belong to the user
    if (accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: accountId, userId },
      });
      if (!account)
        throw new NotFoundException(
          'Account not found or does not belong to user',
        );
    }
    if (categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: categoryId, userId },
      });
      if (!category)
        throw new NotFoundException(
          'Category not found or does not belong to user',
        );
    }
    if (creditCardId) {
      const card = await this.prisma.creditCard.findFirst({
        where: { id: creditCardId, userId },
      });
      if (!card)
        throw new NotFoundException(
          'Credit card not found or does not belong to user',
        );
    }

    return this.prisma.$transaction(async (tx) => {
      // CRITICAL: Balance check + row lock before EXPENSE to prevent overdraft
      if (type === TransactionType.EXPENSE && accountId) {
        const rows = await tx.$queryRaw<
          AccountRow[]
        >`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${accountId} AND "userId" = ${userId} FOR UPDATE`;
        const account = rows[0];
        if (!account) throw new NotFoundException('Account not found');
        const currentBalance = decryptAmount(account.balance, this.encryption);
        if (currentBalance < amount) {
          throw new BadRequestException('Saldo insuficiente');
        }
      }

      const encryptedAmount = encryptAmount(amount, this.encryption);

      const transaction = await tx.transaction.create({
        data: {
          ...createTransactionDto,
          amount: encryptedAmount,
          date,
          userId,
        },
        include: { category: true },
      });

      if (accountId) {
        const adjustment =
          type === TransactionType.INCOME
            ? amount
            : type === TransactionType.EXPENSE
              ? -amount
              : 0;
        if (adjustment !== 0) {
          await atomicBalanceUpdate(
            tx,
            accountId,
            userId,
            adjustment,
            this.encryption,
          );
        }
      }

      // Audit log
      void this.auditService.log({
        action: 'transaction.create',
        actorId: userId,
        targetType: 'Transaction',
        targetId: transaction.id,
      });

      return transaction;
    });
  }

  async getUserCategories(userId: string) {
    return this.prisma.category.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, type: true, icon: true },
    });
  }

  /**
   * Busca a categoria que o usuário usou anteriormente para a mesma descrição.
   */
  async findUserCategoryForDescription(
    userId: string,
    description: string,
  ): Promise<{ id: string; name: string } | null> {
    const match = await this.prisma.transaction.findFirst({
      where: {
        userId,
        description,
        categoryId: { not: null },
        deletedAt: null,
      },
      orderBy: { date: 'desc' },
      select: { category: { select: { id: true, name: true } } },
    });
    return match?.category ?? null;
  }

  findAll(userId: string, year?: number, month?: number) {
    const whereClause: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
    };

    if (year !== undefined && month !== undefined) {
      const startOfMonth = new Date(Date.UTC(year, month, 1));
      const endOfMonth = new Date(
        Date.UTC(year, month + 1, 0, 23, 59, 59, 999),
      );
      whereClause.date = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    }

    return this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      include: { category: true },
    });
  }

  findOne(id: string, userId: string) {
    return this.prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      include: { category: true },
    });
  }

  async export(userId: string): Promise<string> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null },
      orderBy: { date: 'desc' },
      include: { category: true },
    });

    const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria'];
    const rows = transactions.map((t) => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const amount = t.amount.toString().replace('.', ',');
      const type = t.type === 'INCOME' ? 'Receita' : 'Despesa';
      const categoryName =
        t.category?.name || t.categoryLegacy || 'Sem categoria';
      return [
        date,
        `"${t.description}"`,
        amount,
        type,
        `"${categoryName}"`,
      ].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
  }

  async exportReport(userId: string) {
    const [transactions, accounts, creditCards, categories, invoices] =
      await Promise.all([
        this.prisma.transaction.findMany({
          where: { userId, deletedAt: null },
          orderBy: { date: 'desc' },
          include: { category: true, account: true, creditCard: true },
        }),
        this.prisma.account.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.creditCard.findMany({
          where: { userId, deletedAt: null },
          include: { invoices: { where: { isPaid: false } } },
        }),
        this.prisma.category.findMany({ where: { userId, deletedAt: null } }),
        this.prisma.creditCardInvoice.findMany({
          where: { userId },
          orderBy: [{ referenceYear: 'desc' }, { referenceMonth: 'desc' }],
          include: { creditCard: true },
          take: 12,
        }),
      ]);

    const byMonth = new Map<string, { income: number; expense: number }>();
    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, { income: 0, expense: 0 });
      const m = byMonth.get(key)!;
      if (t.type === 'INCOME') m.income += Number(t.amount);
      else if (t.type === 'EXPENSE') m.expense += Number(t.amount);
    });

    const balance = accounts.reduce(
      (sum, a) => sum + decryptAmount(a.balance, this.encryption),
      0,
    );
    const creditCardDebt = creditCards.reduce(
      (sum, c) =>
        sum +
        c.invoices.reduce(
          (invSum, inv) =>
            invSum +
            decryptAmount(inv.totalAmount, this.encryption) -
            decryptAmount(inv.paidAmount, this.encryption),
          0,
        ),
      0,
    );

    return {
      exportedAt: new Date().toISOString(),
      balance,
      creditCardDebt,
      accounts: accounts.map((a) => ({
        name: a.name,
        balance: decryptAmount(a.balance, this.encryption),
      })),
      creditCards: creditCards.map((c) => ({
        name: c.name,
        limit: Number(c.limit),
        debt: c.invoices.reduce(
          (s, i) =>
            s +
            decryptAmount(i.totalAmount, this.encryption) -
            decryptAmount(i.paidAmount, this.encryption),
          0,
        ),
      })),
      monthlySummary: Array.from(byMonth.entries())
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([month, data]) => ({ month, ...data })),
      invoices: invoices.map((i) => ({
        creditCardName: i.creditCard.name,
        reference: `${String(i.referenceMonth).padStart(2, '0')}/${i.referenceYear}`,
        totalAmount: decryptAmount(i.totalAmount, this.encryption),
        paidAmount: decryptAmount(i.paidAmount, this.encryption),
        remaining:
          decryptAmount(i.totalAmount, this.encryption) -
          decryptAmount(i.paidAmount, this.encryption),
        isPaid: i.isPaid,
        dueDate: i.dueDate,
      })),
      categories: categories.map((c) => ({ name: c.name, type: c.type })),
      transactions: transactions.slice(0, 200).map((t) => ({
        date: t.date,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        category: t.category?.name || t.categoryLegacy || 'Outros',
        account: t.account?.name || null,
        creditCard: t.creditCard?.name || null,
      })),
    };
  }

  async update(
    id: string,
    updateTransactionDto: UpdateTransactionDto,
    userId: string,
  ) {
    // V9: Future date validation (same as create/transfer/import)
    if (updateTransactionDto.date) {
      const date = new Date(updateTransactionDto.date);
      if (date > new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)) {
        throw new BadRequestException(
          'Data não pode ser mais que 2 dias no futuro',
        );
      }
    }

    // VULN-04: Validate FK ownership before entering the transaction
    if (updateTransactionDto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: updateTransactionDto.accountId, userId },
      });
      if (!account)
        throw new NotFoundException(
          'Account not found or does not belong to user',
        );
    }
    if (updateTransactionDto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: updateTransactionDto.categoryId, userId },
      });
      if (!category)
        throw new NotFoundException(
          'Category not found or does not belong to user',
        );
    }
    if (updateTransactionDto.creditCardId) {
      const card = await this.prisma.creditCard.findFirst({
        where: { id: updateTransactionDto.creditCardId, userId },
      });
      if (!card)
        throw new NotFoundException(
          'Credit card not found or does not belong to user',
        );
    }

    return this.prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!oldTx) return null;

      const oldTxType = oldTx.type as TransactionType;

      // VULN-05: Lock the old account row with userId scoping
      if (oldTx.accountId) {
        await tx.$queryRaw<
          AccountRow[]
        >`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${oldTx.accountId} AND "userId" = ${userId} FOR UPDATE`;
      }

      // 1. Revert old balance if there was an accountId
      if (oldTx.accountId) {
        const oldAmount = Number(oldTx.amount);
        const revertAdj =
          oldTxType === TransactionType.INCOME
            ? -oldAmount
            : oldTxType === TransactionType.EXPENSE
              ? oldAmount
              : 0;
        if (revertAdj !== 0) {
          await atomicBalanceUpdate(
            tx,
            oldTx.accountId,
            userId,
            revertAdj,
            this.encryption,
          );
        }
      }

      // 2. Update the transaction
      const newAmount =
        updateTransactionDto.amount !== undefined
          ? Number(updateTransactionDto.amount)
          : Number(oldTx.amount);
      const newType = updateTransactionDto.type ?? oldTxType;

      let newAccountId = oldTx.accountId;
      if (updateTransactionDto.accountId !== undefined) {
        newAccountId = updateTransactionDto.accountId;
      }

      // VULN-05: Lock the new account row if it's different from the old one
      if (newAccountId && newAccountId !== oldTx.accountId) {
        await tx.$queryRaw<
          AccountRow[]
        >`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${newAccountId} AND "userId" = ${userId} FOR UPDATE`;
      }

      // VULN-03: Overdraft check
      if (newType === TransactionType.EXPENSE && newAccountId) {
        const rows = await tx.$queryRaw<
          AccountRow[]
        >`SELECT id, "userId", balance, "deletedAt" FROM "Account" WHERE id = ${newAccountId} AND "userId" = ${userId} FOR UPDATE`;
        const account = rows[0];
        if (!account) throw new NotFoundException('Account not found');
        if (decryptAmount(account.balance, this.encryption) < newAmount) {
          throw new BadRequestException('Saldo insuficiente');
        }
      }

      const {
        amount: updateAmount,
        version,
        ...updateRest
      } = updateTransactionDto;
      const updated = await tx.transaction.updateMany({
        where: { id, userId, ...(version !== undefined ? { version } : {}) },
        data: {
          ...updateRest,
          amount: updateAmount
            ? encryptAmount(Number(updateAmount), this.encryption)
            : undefined,
          date: updateTransactionDto.date
            ? new Date(updateTransactionDto.date)
            : undefined,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        throw version !== undefined
          ? new ConflictException('Transação foi modificada por outro usuário')
          : new NotFoundException('Transação não encontrada');
      }

      // 3. Apply new balance if there's an accountId
      if (newAccountId) {
        const applyAdj =
          newType === TransactionType.INCOME
            ? newAmount
            : newType === TransactionType.EXPENSE
              ? -newAmount
              : 0;
        if (applyAdj !== 0) {
          await atomicBalanceUpdate(
            tx,
            newAccountId,
            userId,
            applyAdj,
            this.encryption,
          );
        }
      }

      // Audit log
      void this.auditService.log({
        action: 'transaction.update',
        actorId: userId,
        targetType: 'Transaction',
        targetId: id,
      });

      return tx.transaction.findFirst({
        where: { id, userId, deletedAt: null },
        include: { category: true },
      });
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId, deletedAt: null },
      });

      if (!oldTx) return { count: 0 };

      const oldTxType = oldTx.type as TransactionType;

      // Prevent double-delete - use conditional soft delete
      const deleteResult = await tx.transaction.updateMany({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (deleteResult.count === 0) return { count: 0 };

      // If this transaction is part of an installment, soft-delete all siblings
      let siblingCount = 0;
      const deletedIds: string[] = [id];
      if (oldTx.currentInstallment && oldTx.installmentCount) {
        const baseDescription = oldTx.description
          .replace(/\s*\(\d+\/\d+\)\s*$/, '')
          .trim();
        const siblingIds = await tx.transaction.findMany({
          where: {
            userId,
            deletedAt: null,
            description: { startsWith: baseDescription + ' (' },
            creditCardId: oldTx.creditCardId,
            installmentCount: oldTx.installmentCount,
            id: { not: id },
          },
          select: { id: true },
        });
        if (siblingIds.length > 0) {
          const siblingResult = await tx.transaction.updateMany({
            where: {
              id: { in: siblingIds.map((s) => s.id) },
              userId,
              deletedAt: null,
            },
            data: { deletedAt: new Date() },
          });
          siblingCount = siblingResult.count;
          deletedIds.push(...siblingIds.map((s) => s.id));

          // Revert balance for each sibling that has an accountId
          for (const sibling of siblingIds) {
            const sibTx = await tx.transaction.findFirst({
              where: { id: sibling.id, userId },
            });
            if (sibTx?.accountId) {
              const sibAmount = Number(sibTx.amount);
              const sibTxType = sibTx.type as TransactionType;
              const revertAdj =
                sibTxType === TransactionType.INCOME
                  ? -sibAmount
                  : sibTxType === TransactionType.EXPENSE
                    ? sibAmount
                    : 0;
              if (revertAdj !== 0) {
                await atomicBalanceUpdate(
                  tx,
                  sibTx.accountId,
                  userId,
                  revertAdj,
                  this.encryption,
                );
              }
            }
          }
        }
      }

      if (oldTx.accountId) {
        const oldAmount = Number(oldTx.amount);
        const revertAdj =
          oldTxType === TransactionType.INCOME
            ? -oldAmount
            : oldTxType === TransactionType.EXPENSE
              ? oldAmount
              : 0;
        if (revertAdj !== 0) {
          await atomicBalanceUpdate(
            tx,
            oldTx.accountId,
            userId,
            revertAdj,
            this.encryption,
          );
        }
      }

      // Audit log
      void this.auditService.log({
        action: 'transaction.delete',
        actorId: userId,
        targetType: 'Transaction',
        targetId: id,
        severity: 'warn',
      });

      return { count: deleteResult.count + siblingCount, deletedIds };
    });
  }
}
