import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreditCardInvoiceService } from '../credit-card-invoices/credit-card-invoices.service';
import { EncryptionService } from '../common/services/encryption.service';
import { decryptAmount } from '../common/services/balance-helper';

@Injectable()
export class AutoTransactionScheduler {
  private readonly logger = new Logger(AutoTransactionScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private invoiceService: CreditCardInvoiceService,
    private encryption: EncryptionService,
  ) {}

  /**
   * Runs daily at 2 AM Brasília time (5 AM UTC).
   * Generates interactive notifications instead of auto-creating transactions.
   * Also closes credit card invoices that hit their closing day.
   */
  @Cron('0 5 * * *')
  async handleAutoTransactions() {
    this.logger.log('🔔 Starting auto-notification processing...');

    await this.processRecurringTransactions();
    await this.processInstallments();
    await this.processInvoiceClosing();

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
      // Check if already notified this month for THIS recurring item
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: r.userId,
          type: 'ACTION_RECURRING',
          metadata: {
            path: ['recurringTransactionId'],
            equals: r.id,
          },
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

      const isIncome = r.type === 'INCOME';
      const rawAmount = decryptAmount(r.amount, this.encryption);
      await this.notificationsService.create(r.userId, {
        title: isIncome ? '📥 Receita Recorrente' : '💰 Despesa Recorrente',
        message: `"${r.description}" de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rawAmount)} ${isIncome ? 'prevista para hoje. Já recebeu?' : 'vence hoje. Já foi pago?'}`,
        type: 'ACTION_RECURRING',
        actionType: 'CONFIRM_PAYMENT',
        actionMeta: {
          recurringTransactionId: r.id,
          description: r.description,
          amount: rawAmount,
          transactionType: r.type, // INCOME or EXPENSE — used by handleAction
          accountId: r.accountId,
          categoryId: r.categoryId,
          creditCardId: r.creditCardId,
        },
      });

      this.logger.log(
        `  🔔 Notified: "${r.description}" — R$ ${rawAmount.toFixed(2)}`,
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

    // Fetch all active installments due today, then filter in JS
    // because Prisma doesn't support comparing two fields in a where clause
    const installments = await this.prisma.creditCardInstallment.findMany({
      where: {
        isActive: true,
        dueDay,
      },
      include: { creditCard: true },
    });

    // Only notify installments that haven't been fully paid yet
    const activeInstallments = installments.filter(
      (inst) => inst.currentInstallment < inst.installmentCount,
    );

    let notified = 0;
    for (const inst of activeInstallments) {
      const nextInstallment = inst.currentInstallment + 1;

      // For the first installment, use entryAmount if it exists (down payment)
      const installmentAmount =
        inst.currentInstallment === 0 && inst.entryAmount
          ? decryptAmount(inst.entryAmount, this.encryption)
          : decryptAmount(inst.amountPerMonth, this.encryption);

      // Check if already notified this month for THIS installment
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: inst.userId,
          type: 'ACTION_INSTALLMENT',
          metadata: {
            path: ['installmentId'],
            equals: inst.id,
          },
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
        message: `Parcela ${nextInstallment}/${inst.installmentCount} de "${inst.description}" — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installmentAmount)} no cartão ${inst.creditCard.name}. ${inst.currentInstallment === 0 && inst.entryAmount ? '(Entrada + ' + (inst.installmentCount - 1) + 'x)' : ''}Já pagou?`,
        type: 'ACTION_INSTALLMENT',
        actionType: 'CONFIRM_PAYMENT',
        actionMeta: {
          installmentId: inst.id,
          description: `${inst.description} (${nextInstallment}/${inst.installmentCount})`,
          amount: installmentAmount,
          currentInstallment: nextInstallment,
          installmentCount: inst.installmentCount,
          accountId: inst.accountId,
          categoryId: inst.categoryId,
          creditCardId: inst.creditCardId,
        },
      });

      this.logger.log(
        `  💳 Parcela ${nextInstallment}/${inst.installmentCount} "${inst.description}" — R$ ${installmentAmount.toFixed(2)}`,
      );
      notified++;
    }

    if (notified > 0) {
      this.logger.log(`📋 Generated ${notified} installment notification(s)`);
    }
  }

  /**
   * Closes credit card invoices that hit their closing day today.
   * This makes the invoice model useful without requiring manual user action.
   * Also notifies users of invoices due for payment today.
   */
  private async processInvoiceClosing() {
    // 1. Close invoices for cards whose closing day is today
    try {
      const result = await this.invoiceService.closeAllDueInvoices();
      if (result.closed > 0 || result.skipped > 0) {
        this.logger.log(
          `📄 Invoices: ${result.closed} closed, ${result.skipped} skipped`,
        );
      }
    } catch (error) {
      this.logger.error('❌ Error processing invoice closing:', (error as Error).message);
    }

    // 2. Notify users of unpaid invoices whose dueDay is today
    await this.processInvoiceDueReminders();
  }

  /**
   * Creates ACTION_INVOICE_DUE notifications for unpaid invoices
   * whose due date is today.
   */
  private async processInvoiceDueReminders() {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

    // Find all unpaid invoices whose dueDate is today
    const dueInvoices = await this.prisma.creditCardInvoice.findMany({
      where: {
        isPaid: false,
        dueDate: {
          gte: new Date(todayStr),
          lt: new Date(todayStr + 'T23:59:59.999Z'),
        },
      },
      include: { creditCard: true },
    });

    let notified = 0;
    for (const invoice of dueInvoices) {
      // Check if already notified for this invoice
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: invoice.userId,
          type: 'ACTION_INVOICE_DUE',
          metadata: {
            path: ['invoiceId'],
            equals: invoice.id,
          },
        },
      });

      if (existing) {
        this.logger.debug(
          `  ⏭️ Skipping invoice ${invoice.id} — already notified`,
        );
        continue;
      }

      const invoiceTotalAmount = decryptAmount(invoice.totalAmount, this.encryption);
      const invoicePaidAmount = decryptAmount(invoice.paidAmount, this.encryption);
      const invoiceRemaining = invoiceTotalAmount - invoicePaidAmount;

      await this.notificationsService.create(invoice.userId, {
        title: '📄 Fatura do Cartão Vence Hoje',
        message: `Fatura de ${invoice.creditCard.name} — ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(invoiceTotalAmount)} vence hoje. Já pagou?`,
        type: 'ACTION_INVOICE_DUE',
        actionType: 'CONFIRM_PAYMENT',
        actionMeta: {
          invoiceId: invoice.id,
          creditCardId: invoice.creditCardId,
          creditCardName: invoice.creditCard.name,
          accountId: invoice.creditCard.accountId,
          amount: invoiceRemaining > 0 ? invoiceRemaining : invoiceTotalAmount,
          description: `Pagamento fatura ${invoice.creditCard.name} - ${String(invoice.referenceMonth).padStart(2, '0')}/${invoice.referenceYear}`,
          referenceMonth: invoice.referenceMonth,
          referenceYear: invoice.referenceYear,
        },
      });

      this.logger.log(
        `  📄 Invoice due: ${invoice.creditCard.name} — R$ ${invoiceTotalAmount.toFixed(2)}`,
      );
      notified++;
    }

    if (notified > 0) {
      this.logger.log(`📋 Generated ${notified} invoice due notification(s)`);
    }
  }
}
