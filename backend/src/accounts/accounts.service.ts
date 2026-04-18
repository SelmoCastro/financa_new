import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private prisma: PrismaService) {}

  async create(createAccountDto: CreateAccountDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create the account
      const account = await tx.account.create({
        data: {
          ...createAccountDto,
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
      // Soft-delete all transactions belonging to this account
      await tx.transaction.updateMany({
        where: { accountId: id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
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
    const account = await this.findOne(id, userId);

    // Sum all active transactions for this account
    const result = await this.prisma.transaction.aggregate({
      where: { accountId: id, userId, deletedAt: null },
      _sum: { amount: true },
    });

    // Calculate correct balance: INCOME adds, EXPENSE subtracts
    const transactions = await this.prisma.transaction.findMany({
      where: { accountId: id, userId, deletedAt: null },
      select: { amount: true, type: true },
    });

    let calculatedBalance = 0;
    for (const tx of transactions) {
      const amt = Number(tx.amount);
      if (tx.type === 'INCOME') calculatedBalance += amt;
      else if (tx.type === 'EXPENSE') calculatedBalance -= amt;
    }

    const currentBalance = Number(account.balance);
    const drift = calculatedBalance - currentBalance;

    if (drift !== 0) {
      // Fix the balance
      await this.prisma.account.update({
        where: { id },
        data: { balance: { increment: drift } },
      });
    }

    return {
      accountId: id,
      previousBalance: currentBalance,
      calculatedBalance,
      drift,
      fixed: drift !== 0,
      transactionCount: transactions.length,
    };
  }
}
