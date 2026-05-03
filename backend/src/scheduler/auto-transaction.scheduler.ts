import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AutoTransactionScheduler {
  private readonly logger = new Logger(AutoTransactionScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Runs daily at 2 AM Brasília time (5 AM UTC).
   * Generates interactive notifications instead of auto-creating transactions.
   */
  @Cron('0 5 * * *')
  async handleAutoTransactions() {
    this.logger.log('🔔 Starting auto-notification processing...');

    await this.processRecurringTransactions();
    await this.processInstallments();

    this.logger.log('✅ Auto-notification processing complete.');
  }

  /**
   * Creates ACTION_RECURRING notifications for active recurring items due today.
   * User confirms payment via notification action.
   */
  private async processRecurringTransactions() {
    const today = new Date();
    const dueDay = today.getDate();
    const currentMonth = today.getMonth() + 1;

    const recorrentes = await this.prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        dueDay,
        startMonth: { lte: currentMonth },
        OR: [{ endMonth: null }, { endMonth: { gte: currentMonth } }],
      },
    });

    let notified = 0;
    for (const r of recorrentes) {
      // Check if already notified this month
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: r.userId,
          type: 'ACTION_RECURRING',
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
        },
      });

      if (existing) {
        this.logger.debug(
          `  ⏭️ Skipping "${r.description}" — already notified this month`,
        );
        continue;
      }

      await this.notificationsService.create(r.userId, {
        title: '💰 Despesa Recorrente',
        message: `"${r.description}" de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(r.amount))} vence hoje. Já foi pago?`,
        type: 'ACTION_RECURRING',
        actionType: 'CONFIRM_PAYMENT',
        actionMeta: {
          recurringTransactionId: r.id,
          description: r.description,
          amount: Number(r.amount),
          accountId: r.accountId,
          categoryId: r.categoryId,
          creditCardId: r.creditCardId,
        },
      });

      this.logger.log(
        `  🔔 Notified: "${r.description}" — R$ ${Number(r.amount).toFixed(2)}`,
      );
      notified++;
    }

    if (notified > 0) {
      this.logger.log(`📋 Generated ${notified} recurring notification(s)`);
    }
  }

  /**
   * Creates ACTION_INSTALLMENT notifications for active credit card installments due today.
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
      include: { creditCard: true },
    });

    let notified = 0;
    for (const inst of installments) {
      const nextInstallment = inst.currentInstallment + 1;

      // Check if already notified this month
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: inst.userId,
          type: 'ACTION_INSTALLMENT',
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
            lt: new Date(today.getFullYear(), today.getMonth() + 1, 1),
          },
        },
      });

      if (existing) {
        this.logger.debug(
          `  ⏭️ Skipping installment "${inst.description}" — already notified`,
        );
        continue;
      }

      await this.notificationsService.create(inst.userId, {
        title: '💳 Parcela Cartão de Crédito',
        message: `Parcela ${nextInstallment}/${inst.installmentCount} de "${inst.description}" — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(inst.amountPerMonth))} no cartão ${inst.creditCard.name}. Já pagou?`,
        type: 'ACTION_INSTALLMENT',
        actionType: 'CONFIRM_PAYMENT',
        actionMeta: {
          installmentId: inst.id,
          description: `${inst.description} (${nextInstallment}/${inst.installmentCount})`,
          amount: Number(inst.amountPerMonth),
          accountId: inst.accountId,
          categoryId: inst.categoryId,
          creditCardId: inst.creditCardId,
        },
      });

      this.logger.log(
        `  💳 Parcela ${nextInstallment}/${inst.installmentCount} "${inst.description}" — R$ ${Number(inst.amountPerMonth).toFixed(2)}`,
      );
      notified++;
    }

    if (notified > 0) {
      this.logger.log(`📋 Generated ${notified} installment notification(s)`);
    }
  }
}
