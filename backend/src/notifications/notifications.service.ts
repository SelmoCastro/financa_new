import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    data: {
      title: string;
      message: string;
      type: string;
      metadata?: Record<string, unknown> | null;
      actionType?: string;
      actionMeta?: Record<string, unknown> | null;
    },
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : {},
        actionType: data.actionType,
        actionMeta: data.actionMeta ? JSON.parse(JSON.stringify(data.actionMeta)) : undefined,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * Processa ação do usuário em notificação interativa.
   * - confirm: cria transação + atualiza saldo + incrementa parcela (se aplicável)
   * - confirm (ACTION_INVOICE_DUE): paga a fatura debitando da conta vinculada
   * - postpone: apenas marca como lida
   */
  async handleAction(id: string, action: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notif) throw new NotFoundException('Notificação não encontrada');

    const meta = (notif.actionMeta || {}) as Record<string, any>;

    if (action === 'confirm') {
      // ACTION_INVOICE_DUE: pay the credit card invoice
      if (notif.type === 'ACTION_INVOICE_DUE') {
        const invoiceId = meta.invoiceId as string;
        const accountId = meta.accountId as string;
        const amount = meta.amount as number;

        if (!invoiceId || !accountId) {
          throw new BadRequestException('Dados da fatura incompletos');
        }

        // Use interactive transaction for atomicity
        const result = await this.prisma.$transaction(async (tx) => {
          // 1. Lock and verify the account
          const rows = await tx.$queryRaw<
            { id: string; balance: number }[]
          >`SELECT id, balance FROM "Account" WHERE id = ${accountId} AND "userId" = ${userId} AND "deletedAt" IS NULL FOR UPDATE`;

          if (!rows[0]) {
            throw new BadRequestException('Conta não encontrada ou não pertence a este usuário');
          }
          if (Number(rows[0].balance) < amount) {
            throw new BadRequestException('Saldo insuficiente para pagar a fatura');
          }

          // 2. Debit the account
          await tx.account.updateMany({
            where: { id: accountId, userId },
            data: { balance: { decrement: amount } },
          });

          // 3. Update the invoice
          const invoice = await tx.creditCardInvoice.update({
            where: { id: invoiceId },
            data: {
              paidAmount: { increment: amount },
              isPaid: true,
              paidAt: new Date(),
            },
            include: { creditCard: true },
          });

          // 4. Create a traceability transaction
          await tx.transaction.create({
            data: {
              description: meta.description || `Pagamento fatura ${invoice.creditCard?.name || ''}`,
              amount,
              date: new Date(),
              type: 'EXPENSE',
              accountId,
              invoiceId,
              userId,
            },
          });

          // 5. Mark notification as read
          await tx.notification.update({
            where: { id },
            data: { isRead: true },
          });

          return invoice;
        });

        return {
          success: true,
          invoiceId,
          message: `Fatura paga com sucesso! R$ ${amount.toFixed(2)} debitado da conta.`,
        };
      }

      if (
        notif.type === 'ACTION_RECURRING' ||
        notif.type === 'ACTION_INSTALLMENT'
      ) {
        const amount = meta.amount;
        const type = meta.transactionType || 'EXPENSE'; // Use transactionType from scheduler, fallback to EXPENSE for installments

        // Use interactive transaction for true atomicity — locks are held
        // throughout, preventing race conditions on balance and installment state
        const [transaction] = await this.prisma.$transaction(async (tx) => {
          // 1. If accountId present, verify ownership AND sufficient balance (atomic)
          if (meta.accountId) {
            const account = await tx.account.findFirst({
              where: { id: meta.accountId, userId },
            });
            if (!account) {
              throw new BadRequestException('Conta não encontrada ou não pertence a este usuário');
            }
            if (type === 'EXPENSE' && Number(account.balance) < Number(amount)) {
              throw new BadRequestException('Saldo insuficiente para esta operação');
            }
          }

          // 2. Create the transaction
          const txn = await tx.transaction.create({
            data: {
              description: meta.description,
              amount,
              date: new Date(),
              type,
              categoryId: meta.categoryId || null,
              accountId: meta.accountId || null,
              creditCardId: meta.creditCardId || null,
              userId,
              isFixed: true,
              // Copy installment tracking fields when confirming a parcel
              currentInstallment: meta.currentInstallment || null,
              installmentCount: meta.installmentCount || null,
            },
          });

          // 3. Update account balance if needed
          if (meta.accountId) {
            await tx.account.update({
              where: { id: meta.accountId },
              data: {
                balance: type === 'INCOME'
                  ? { increment: Number(amount) }
                  : { decrement: Number(amount) },
              },
            });
          }

          // 4. If installment, advance the tracker
          if (meta.installmentId) {
            const inst = await tx.creditCardInstallment.findFirst({
              where: { id: meta.installmentId, userId },
            });
            if (inst) {
              const next = inst.currentInstallment + 1;
              await tx.creditCardInstallment.update({
                where: { id: meta.installmentId },
                data: {
                  currentInstallment: next,
                  isActive: next < inst.installmentCount,
                },
              });
            }
          }

          // 5. Mark notification as read
          await tx.notification.update({
            where: { id },
            data: { isRead: true },
          });

          return [txn];
        });

        return {
          success: true,
          transactionId: transaction.id,
          message: `Transação "${meta.description}" lançada com sucesso!`,
        };
      }
    }

    if (action === 'postpone') {
      await this.prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
      return {
        success: true,
        postponed: true,
        message: `"${meta.description}" adiado.`,
      };
    }

    throw new BadRequestException(
      'Ação não suportada para este tipo de notificação',
    );
  }
}
