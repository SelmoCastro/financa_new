/**
 * Service do domínio de lançamentos recorrentes; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import { EncryptionService } from '../common/services/encryption.service';
import {
  encryptAmount,
  decryptAmount,
} from '../common/services/balance-helper';

@Injectable()
export class RecurringTransactionsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  private async validateFkOwnership(
    dto: { accountId?: string; categoryId?: string; creditCardId?: string },
    userId: string,
  ) {
    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId, deletedAt: null },
      });
      if (!account)
        throw new BadRequestException(
          'Conta não encontrada ou não pertence a este usuário',
        );
    }
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId, deletedAt: null },
      });
      if (!category)
        throw new BadRequestException(
          'Categoria não encontrada ou não pertence a este usuário',
        );
    }
    if (dto.creditCardId) {
      const card = await this.prisma.creditCard.findFirst({
        where: { id: dto.creditCardId, userId, deletedAt: null },
      });
      if (!card)
        throw new BadRequestException(
          'Cartão não encontrado ou não pertence a este usuário',
        );
    }
  }

  async create(dto: CreateRecurringTransactionDto, userId: string) {
    // Validate FK ownership
    await this.validateFkOwnership(dto, userId);

    const { amount, ...rest } = dto;
    return this.prisma.recurringTransaction.create({
      data: {
        ...rest,
        amount: encryptAmount(amount, this.encryption),
        userId,
      },
      include: { category: true, account: true, creditCard: true },
    });
  }

  private async migrateLegacyFixedTransactions(userId: string) {
    const [recorrentes, legacyTransactions] = await Promise.all([
      this.prisma.recurringTransaction.findMany({
        where: { userId },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          isFixed: true,
          type: { in: ['INCOME', 'EXPENSE'] },
        },
        select: {
          description: true,
          amount: true,
          type: true,
          categoryId: true,
          accountId: true,
          creditCardId: true,
          date: true,
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    const keyFor = (item: {
      description: string;
      amount: string;
      type: string;
      categoryId: string | null;
      accountId: string | null;
      creditCardId: string | null;
    }) =>
      JSON.stringify([
        item.description.trim().toLowerCase(),
        decryptAmount(item.amount, this.encryption),
        item.type,
        item.categoryId,
        item.accountId,
        item.creditCardId,
      ]);

    const existingKeys = new Set(recorrentes.map(keyFor));
    const pendingKeys = new Set<string>();

    for (const transaction of legacyTransactions) {
      const key = keyFor(transaction);
      if (existingKeys.has(key) || pendingKeys.has(key)) continue;

      const amount = decryptAmount(transaction.amount, this.encryption);
      await this.prisma.recurringTransaction.create({
        data: {
          description: transaction.description,
          amount: encryptAmount(amount, this.encryption),
          type: transaction.type,
          categoryId: transaction.categoryId,
          accountId: transaction.accountId,
          creditCardId: transaction.creditCardId,
          dueDay: transaction.date.getUTCDate(),
          startMonth: transaction.date.getUTCMonth() + 1,
          userId,
        },
      });
      pendingKeys.add(key);
    }
  }

  async findAll(userId: string) {
    await this.migrateLegacyFixedTransactions(userId);
    return this.prisma.recurringTransaction.findMany({
      where: { userId },
      include: { category: true, account: true, creditCard: true },
      orderBy: { dueDay: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const rt = await this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
      include: { category: true, account: true, creditCard: true },
    });
    if (!rt) throw new NotFoundException('Recorrente não encontrado');
    return rt;
  }

  async update(id: string, dto: UpdateRecurringTransactionDto, userId: string) {
    await this.findOne(id, userId);
    await this.validateFkOwnership(dto, userId);
    const { amount, ...rest } = dto;
    await this.prisma.recurringTransaction.updateMany({
      where: { id, userId },
      data: {
        ...rest,
        ...(amount !== undefined
          ? { amount: encryptAmount(amount, this.encryption) }
          : {}),
      },
    });
    return this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
      include: { category: true, account: true, creditCard: true },
    });
  }

  async remove(id: string, userId: string) {
    const recurring = await this.findOne(id, userId);
    const legacyTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        isFixed: true,
        type: recurring.type,
        description: recurring.description,
        categoryId: recurring.categoryId,
        accountId: recurring.accountId,
        creditCardId: recurring.creditCardId,
      },
      select: { id: true, amount: true },
    });
    const recurringAmount = decryptAmount(recurring.amount, this.encryption);
    const legacyIds = legacyTransactions
      .filter(
        (transaction) =>
          decryptAmount(transaction.amount, this.encryption) ===
          recurringAmount,
      )
      .map((transaction) => transaction.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.recurringTransaction.deleteMany({
        where: { id, userId },
      });
      if (legacyIds.length > 0) {
        await tx.transaction.updateMany({
          where: { id: { in: legacyIds }, userId, isFixed: true },
          data: { isFixed: false },
        });
      }
    });
    return { deleted: true };
  }

  async toggle(id: string, userId: string) {
    const rt = await this.findOne(id, userId);
    await this.prisma.recurringTransaction.updateMany({
      where: { id, userId },
      data: { isActive: !rt.isActive },
    });
    return this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
      include: { category: true, account: true, creditCard: true },
    });
  }

  /**
   * Returns how much of the monthly income is consumed by active recurring expenses.
   */
  async getWeight(userId: string) {
    const [recorrentes, transactions] = await Promise.all([
      this.prisma.recurringTransaction.findMany({
        where: { userId, isActive: true, type: 'EXPENSE' },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: 'INCOME',
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        select: { amount: true },
      }),
    ]);

    const totalFixedExpense = recorrentes.reduce(
      (sum, r) => sum + decryptAmount(r.amount, this.encryption),
      0,
    );
    const monthlyIncome = transactions.reduce(
      (sum, t) => sum + decryptAmount(t.amount, this.encryption),
      0,
    );
    const weight =
      monthlyIncome > 0
        ? Math.round((totalFixedExpense / monthlyIncome) * 100)
        : 0;

    return {
      totalFixedExpense: Math.round(totalFixedExpense * 100) / 100,
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      weight,
      count: recorrentes.length,
    };
  }
}
