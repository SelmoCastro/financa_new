/**
 * Service do domínio de notificações; concentra as regras de negócio, validações e operações de banco ligadas a este fluxo.
 */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import {
  encryptAmount,
  decryptAmount,
  atomicBalanceUpdate,
} from '../common/services/balance-helper';

type NotificationActionMeta = {
  invoiceId?: string;
  accountId?: string;
  amount?: number;
  description?: string;
  transactionType?: 'INCOME' | 'EXPENSE';
  categoryId?: string | null;
  creditCardId?: string | null;
  currentInstallment?: number | null;
  installmentCount?: number | null;
  installmentId?: string;
};

type NotificationCreateData = {
  title: string;
  message: string;
  type: string;
  metadata?: Prisma.InputJsonObject | null;
  actionType?: string;
  actionMeta?: Prisma.InputJsonObject | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async create(userId: string, data: NotificationCreateData) {
    return this.prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata ? structuredClone(data.metadata) : {},
        actionType: data.actionType,
        actionMeta: data.actionMeta
          ? structuredClone(data.actionMeta)
          : undefined,
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

  private parseActionMeta(
    actionMeta: Prisma.JsonValue | null | undefined,
  ): NotificationActionMeta {
    if (
      !actionMeta ||
      typeof actionMeta !== 'object' ||
      Array.isArray(actionMeta)
    ) {
      return {};
    }

    const meta = actionMeta as Record<string, unknown>;

    return {
      invoiceId: this.getString(meta.invoiceId),
      accountId: this.getString(meta.accountId),
      amount: this.getNumber(meta.amount),
      description: this.getString(meta.description),
      transactionType: this.getTransactionType(meta.transactionType),
      categoryId: this.getNullableString(meta.categoryId),
      creditCardId: this.getNullableString(meta.creditCardId),
      currentInstallment: this.getNullableNumber(meta.currentInstallment),
      installmentCount: this.getNullableNumber(meta.installmentCount),
      installmentId: this.getString(meta.installmentId),
    };
  }

  private getString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private getNullableString(value: unknown): string | null | undefined {
    if (value === null) {
      return null;
    }

    return typeof value === 'string' ? value : undefined;
  }

  private getNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private getNullableNumber(value: unknown): number | null | undefined {
    if (value === null) {
      return null;
    }

    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private getTransactionType(value: unknown): 'INCOME' | 'EXPENSE' | undefined {
    return value === 'INCOME' || value === 'EXPENSE' ? value : undefined;
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

    const meta = this.parseActionMeta(notif.actionMeta);

    if (action === 'confirm') {
      // ACTION_INVOICE_DUE: pay the credit card invoice
      if (notif.type === 'ACTION_INVOICE_DUE') {
        const invoiceId = meta.invoiceId;
        const accountId = meta.accountId;
        let amount = meta.amount;

        if (!invoiceId || !accountId) {
          throw new BadRequestException('Dados da fatura incompletos');
        }

        // If amount is null/NaN (from old notifications with encrypted values),
        // recalculate from the invoice itself
        if (!amount || isNaN(amount)) {
          const invoice = await this.prisma.creditCardInvoice.findFirst({
            where: { id: invoiceId, userId },
          });
          if (invoice) {
            const total = decryptAmount(invoice.totalAmount, this.encryption);
            const paid = decryptAmount(invoice.paidAmount, this.encryption);
            amount = total - paid;
          }
        }

        if (!amount || isNaN(amount)) {
          throw new BadRequestException(
            'Valor da fatura indisponível — exclua esta notificação',
          );
        }
        const invoiceAmount = amount;

        // Use interactive transaction for atomicity
        await this.prisma.$transaction(async (tx) => {
          // 1. Lock and verify the account
          const rows = await tx.$queryRaw<
            { id: string; balance: string }[]
          >`SELECT id, balance FROM "Account" WHERE id = ${accountId} AND "userId" = ${userId} AND "deletedAt" IS NULL FOR UPDATE`;

          if (!rows[0]) {
            throw new BadRequestException(
              'Conta não encontrada ou não pertence a este usuário',
            );
          }
          const currentBalance = decryptAmount(
            rows[0].balance,
            this.encryption,
          );
          if (currentBalance < invoiceAmount) {
            throw new BadRequestException(
              'Saldo insuficiente para pagar a fatura',
            );
          }

          // 2. Debit the account using atomic encrypted balance update
          await atomicBalanceUpdate(
            tx,
            accountId,
            userId,
            -invoiceAmount,
            this.encryption,
          );

          // 3. Update the invoice (paidAmount is now a String field, verify ownership first)
          const existingInvoice = await tx.creditCardInvoice.findFirst({
            where: { id: invoiceId, userId },
          });
          if (!existingInvoice) {
            throw new BadRequestException(
              'Fatura não encontrada ou não pertence a este usuário',
            );
          }
          await tx.creditCardInvoice.updateMany({
            where: { id: invoiceId, userId },
            data: {
              paidAmount: encryptAmount(
                decryptAmount(existingInvoice.paidAmount, this.encryption) +
                  invoiceAmount,
                this.encryption,
              ),
              isPaid: true,
              paidAt: new Date(),
            },
          });

          // 4. Create a traceability transaction (amount is now encrypted string)
          await tx.transaction.create({
            data: {
              description: meta.description || `Pagamento fatura`,
              amount: encryptAmount(invoiceAmount, this.encryption),
              date: new Date(),
              type: 'EXPENSE',
              accountId,
              userId,
            },
          });

          // 5. Mark notification as read (scoped to user)
          await tx.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
          });
        });

        return {
          success: true,
          invoiceId,
          message: `Fatura paga com sucesso! R$ ${invoiceAmount.toFixed(2)} debitado da conta.`,
        };
      }

      if (
        notif.type === 'ACTION_RECURRING' ||
        notif.type === 'ACTION_INSTALLMENT'
      ) {
        const amount = meta.amount;
        const type = meta.transactionType || 'EXPENSE';

        // Guard against null/NaN amount (from old notifications)
        if (amount == null || isNaN(Number(amount))) {
          throw new BadRequestException(
            'Valor da notificação indisponível — exclua e aguarde a próxima',
          );
        }
        const numericAmount = amount;

        const [transaction] = await this.prisma.$transaction(async (tx) => {
          // 1. If accountId present, verify ownership AND sufficient balance (atomic)
          if (meta.accountId) {
            const lockedRows = await tx.$queryRaw<
              { id: string; balance: string }[]
            >`SELECT id, balance FROM "Account" WHERE id = ${meta.accountId} AND "userId" = ${userId} AND "deletedAt" IS NULL FOR UPDATE`;
            if (!lockedRows[0]) {
              throw new BadRequestException(
                'Conta não encontrada ou não pertence a este usuário',
              );
            }
            if (type === 'EXPENSE') {
              const bal = decryptAmount(lockedRows[0].balance, this.encryption);
              if (bal < numericAmount) {
                throw new BadRequestException(
                  'Saldo insuficiente para esta operação',
                );
              }
            }
          }

          // 2. Create the transaction (amount is now encrypted string)
          const txn = await tx.transaction.create({
            data: {
              description: meta.description!,
              amount: encryptAmount(numericAmount, this.encryption),
              date: new Date(),
              type,
              categoryId: meta.categoryId ?? null,
              accountId: meta.accountId ?? null,
              creditCardId: meta.creditCardId ?? null,
              userId,
              isFixed: true,
              currentInstallment: meta.currentInstallment ?? null,
              installmentCount: meta.installmentCount ?? null,
            },
          });

          // 3. Update account balance if needed
          if (meta.accountId) {
            const adjustment =
              type === 'INCOME' ? numericAmount : -numericAmount;
            await atomicBalanceUpdate(
              tx,
              meta.accountId,
              userId,
              adjustment,
              this.encryption,
            );
          }

          // 4. If installment, advance the tracker
          if (meta.installmentId) {
            const inst = await tx.creditCardInstallment.findFirst({
              where: { id: meta.installmentId, userId },
            });
            if (inst) {
              const next = inst.currentInstallment + 1;
              await tx.creditCardInstallment.updateMany({
                where: { id: meta.installmentId, userId },
                data: {
                  currentInstallment: next,
                  isActive: next < inst.installmentCount,
                },
              });
            }
          }

          // 5. Mark notification as read (scoped to user)
          await tx.notification.updateMany({
            where: { id, userId },
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
      await this.prisma.notification.updateMany({
        where: { id, userId },
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
