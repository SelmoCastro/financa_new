import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService, PLAN_LIMITS } from '../subscription/subscription.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async create(createAccountDto: CreateAccountDto, userId: string) {
    // V15: Check account limit based on plan
    const plan = await this.subscriptionService.getPlan(userId);
    const limits = PLAN_LIMITS[plan];
    const currentCount = await this.prisma.account.count({
      where: { userId, deletedAt: null },
    });
    if (limits.maxAccounts !== -1 && currentCount >= limits.maxAccounts) {
      throw new ForbiddenException(
        `Limite de ${limits.maxAccounts} contas atingido. Faça upgrade para Premium para contas ilimitadas.`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the account — balance starts at 0; the increment below applies the initial balance.
      // Using ...createAccountDto would set balance twice (once from DTO, once from increment).
      const { balance: _dtoBalance, ...accountData } = createAccountDto;
      const account = await tx.account.create({
        data: {
          ...accountData,
          balance: 0,
          userId,
        },
      });

      // 2. If initial balance is not zero, create a matching transaction record
      const initialBalance = Number(createAccountDto.balance) || 0;
      if (initialBalance !== 0) {
        // Find or create 'Saldo Inicial' category
        let category = await tx.category.findFirst({
          where: { userId, name: 'Saldo Inicial', deletedAt: null },
        });

        if (!category) {
          category = await tx.category.create({
            data: {
              name: 'Saldo Inicial',
              userId,
              type: initialBalance > 0 ? 'INCOME' : 'EXPENSE',
              icon: '💰',
            },
          });
        }

        await tx.transaction.create({
          data: {
            userId,
            accountId: account.id,
            categoryId: category.id,
            description: 'Saldo Inicial',
            amount: Math.abs(initialBalance),
            type: initialBalance > 0 ? 'INCOME' : 'EXPENSE',
            date: new Date(), // Current date as starting point
            classificationRule: 20, // Objectives/Savings by default
          },
        });

        // 3. Update account balance with the initial balance
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: initialBalance } },
        });
      }

      return account;
    });
  }

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Conta não encontrada');
    return account;
  }

  async update(id: string, updateAccountDto: UpdateAccountDto, userId: string) {
    await this.findOne(id, userId);
    const result = await this.prisma.account.updateMany({
      where: { id, userId, deletedAt: null },
      data: updateAccountDto,
    });
    if (result.count === 0) throw new NotFoundException('Conta não encontrada');
    return this.prisma.account.findUnique({ where: { id } });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.$transaction(async (tx) => {
      // V8: Reverse balance contributions from all active transactions BEFORE soft-deleting them
      const transactions = await tx.transaction.findMany({
        where: { accountId: id, userId, deletedAt: null },
        select: { amount: true, type: true },
      });
      let delta = 0;
      for (const t of transactions) {
        if (t.type === 'INCOME') delta += Number(t.amount);
        else if (t.type === 'EXPENSE') delta -= Number(t.amount);
        // TRANSFER handled by the other side
      }
      // Reverse the delta to bring account balance back to zero net contribution
      if (delta !== 0) {
        await tx.account.updateMany({
          where: { id, userId },
          data: { balance: { increment: -delta } },
        });
      }

      // Soft-delete all transactions belonging to this account
      await tx.transaction.updateMany({
        where: { accountId: id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      // Unlink credit cards from this account (set accountId = null)
      await tx.creditCard.updateMany({
        where: { accountId: id, userId, deletedAt: null },
        data: { accountId: { set: null } },
      });

      // Unlink recurring transactions from this account
      await tx.recurringTransaction.updateMany({
        where: { accountId: id, userId },
        data: { accountId: null },
      });

      // Soft-delete the account
      const result = await tx.account.updateMany({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (result.count === 0) throw new NotFoundException('Conta não encontrada');
      return { deleted: true };
    });
  }

  /**
   * Reconcile account balance from transaction history.
   * Recalculates the correct balance by summing all active (non-soft-deleted) transactions.
   */
  async reconcile(id: string, userId: string) {
    // V18: Lock the account row to prevent concurrent balance changes during reconciliation
    return this.prisma.$transaction(async (tx) => {
      const accounts = await tx.$queryRaw<Array<{ id: string; balance: number }>>`
        SELECT id, balance FROM "Account" WHERE id = ${id} AND "userId" = ${userId} AND "deletedAt" IS NULL FOR UPDATE
      `;
      if (accounts.length === 0) throw new NotFoundException('Conta não encontrada');

      // Sum all active transactions for this account using Decimal arithmetic to avoid float drift
      const transactions = await tx.transaction.findMany({
        where: { accountId: id, userId, deletedAt: null },
        select: { amount: true, type: true },
      });

      let calculatedBalance = new Prisma.Decimal(0);
      for (const t of transactions) {
        if (t.type === 'INCOME') calculatedBalance = calculatedBalance.plus(t.amount);
        else if (t.type === 'EXPENSE') calculatedBalance = calculatedBalance.minus(t.amount);
      }

      const currentBalance = Number(accounts[0].balance);
      const calculatedBalanceNumber = Number(calculatedBalance);
      const drift = Number(calculatedBalance.minus(new Prisma.Decimal(accounts[0].balance)));

      if (drift !== 0) {
        await tx.account.update({
          where: { id },
          data: { balance: { increment: drift } },
        });
      }

      return {
        accountId: id,
        previousBalance: currentBalance,
        calculatedBalance: calculatedBalanceNumber,
        drift,
        fixed: drift !== 0,
        transactionCount: transactions.length,
      };
    });
  }
}
