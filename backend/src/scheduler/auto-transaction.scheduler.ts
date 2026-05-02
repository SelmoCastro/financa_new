import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutoTransactionScheduler {
  private readonly logger = new Logger(AutoTransactionScheduler.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Runs daily at 2 AM Brasília time (5 AM UTC).
   * Processes both recurring transactions and credit card installments.
   */
  @Cron('0 5 * * *')
  async handleAutoTransactions() {
    this.logger.log('🔁 Starting auto-transaction processing...');

    await this.processRecurringTransactions();
    await this.processInstallments();

    this.logger.log('✅ Auto-transaction processing complete.');
  }

  /**
   * Creates transactions for active recurring items that are due today.
   */
  private async processRecurringTransactions() {
    const today = new Date();
    const dueDay = today.getDate();
    const currentMonth = today.getMonth() + 1; // 1-12

    // Only process if current month is within startMonth..endMonth range
    const recorrentes = await this.prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        dueDay,
        startMonth: { lte: currentMonth },
        OR: [
          { endMonth: null },
          { endMonth: { gte: currentMonth } },
        ],
      },
      include: { category: true },
    });

    let created = 0;
    for (const r of recorrentes) {
      // Check if already created this month
      const existing = await this.prisma.transaction.findFirst({
        where: {
          userId: r.userId,
          description: r.description,
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
        },
      });

      if (existing) {
        this.logger.debug(`  ⏭️ Skipping "${r.description}" — already exists this month`);
        continue;
      }

      await this.prisma.transaction.create({
        data: {
          description: r.description,
          amount: r.amount,
          date: today,
          type: r.type,
          categoryId: r.categoryId,
          accountId: r.accountId,
          creditCardId: r.creditCardId,
          userId: r.userId,
          isFixed: true,
        },
      });

      // Update account balance if accountId is set
      if (r.accountId) {
        const amount = Number(r.amount);
        await this.prisma.account.update({
          where: { id: r.accountId },
          data: {
            balance: {
              [r.type === 'INCOME' ? 'increment' : 'decrement']: amount,
            },
          },
        });
      }

      this.logger.log(`  ✅ Created "${r.description}" — R$ ${Number(r.amount).toFixed(2)}`);
      created++;
    }

    if (created > 0) {
      this.logger.log(`📋 Processed ${created} recurring transaction(s)`);
    }
  }

  /**
   * Creates transactions for active credit card installments due today.
   * Increments the currentInstallment counter.
   */
  private async processInstallments() {
    const today = new Date();
    const dueDay = today.getDate();

    const installments = await this.prisma.creditCardInstallment.findMany({
      where: {
        isActive: true,
        dueDay,
        currentInstallment: { lt: this.prisma.creditCardInstallment.fields.installmentCount },
      },
      include: { creditCard: true, category: true },
    });

    let created = 0;
    for (const inst of installments) {
      // Check if already posted this month
      const existing = await this.prisma.transaction.findFirst({
        where: {
          userId: inst.userId,
          description: inst.description + ` (${inst.currentInstallment + 1}/${inst.installmentCount})`,
          date: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
        },
      });

      if (existing) {
        this.logger.debug(`  ⏭️ Skipping installment "${inst.description}" — already posted`);
        continue;
      }

      // Create transaction (always EXPENSE for installments)
      await this.prisma.transaction.create({
        data: {
          description: inst.description + ` (${inst.currentInstallment + 1}/${inst.installmentCount})`,
          amount: inst.amountPerMonth,
          date: today,
          type: 'EXPENSE',
          categoryId: inst.categoryId,
          accountId: inst.accountId,
          creditCardId: inst.creditCardId,
          userId: inst.userId,
          currentInstallment: inst.currentInstallment + 1,
          installmentCount: inst.installmentCount,
          isFixed: true,
        },
      });

      // Debit account if set
      if (inst.accountId) {
        await this.prisma.account.update({
          where: { id: inst.accountId },
          data: {
            balance: {
              decrement: Number(inst.amountPerMonth),
            },
          },
        });
      }

      // Increment currentInstallment
      const next = inst.currentInstallment + 1;
      await this.prisma.creditCardInstallment.update({
        where: { id: inst.id },
        data: {
          currentInstallment: next,
          isActive: next < inst.installmentCount,
        },
      });

      this.logger.log(
        `  💳 Parcela ${next}/${inst.installmentCount} "${inst.description}" — R$ ${Number(inst.amountPerMonth).toFixed(2)}`,
      );
      created++;
    }

    if (created > 0) {
      this.logger.log(`📋 Processed ${created} installment(s)`);
    }
  }
}
