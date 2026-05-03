import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
      metadata?: any;
      actionType?: string;
      actionMeta?: any;
    },
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata || {},
        actionType: data.actionType,
        actionMeta: data.actionMeta,
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
   * - postpone: apenas marca como lida
   */
  async handleAction(id: string, action: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notif) throw new NotFoundException('Notificação não encontrada');

    const meta = (notif.actionMeta || {}) as Record<string, any>;

    if (action === 'confirm') {
      if (
        notif.type === 'ACTION_RECURRING' ||
        notif.type === 'ACTION_INSTALLMENT'
      ) {
        const amount = meta.amount;

        // Criar transação + atualizar saldo atomicamente
        const operations: any[] = [
          this.prisma.transaction.create({
            data: {
              description: meta.description,
              amount,
              date: new Date(),
              type: 'EXPENSE',
              categoryId: meta.categoryId || null,
              accountId: meta.accountId || null,
              creditCardId: meta.creditCardId || null,
              userId,
              isFixed: true,
            },
          }),
        ];

        // Atualizar saldo da conta se tiver accountId
        if (meta.accountId) {
          operations.push(
            this.prisma.account.update({
              where: { id: meta.accountId },
              data: {
                balance: { decrement: Number(amount) },
              },
            }),
          );
        }

        const [transaction] = await this.prisma.$transaction(operations);

        // Se for parcela, incrementar o installment
        if (meta.installmentId) {
          const inst = await this.prisma.creditCardInstallment.findFirst({
            where: { id: meta.installmentId, userId },
          });
          if (inst) {
            const next = inst.currentInstallment + 1;
            await this.prisma.creditCardInstallment.update({
              where: { id: meta.installmentId },
              data: {
                currentInstallment: next,
                isActive: next < inst.installmentCount,
              },
            });
          }
        }

        // Marcar como lida
        await this.prisma.notification.update({
          where: { id },
          data: { isRead: true },
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
