import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SocialService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async sendInvite(
    senderId: string,
    data: {
      amount: number;
      description: string;
      date: string;
      type: string;
      recipientEmail: string;
      originalTransactionId?: string;
    },
  ) {
    // 1. Verify originalTransactionId belongs to sender (if provided)
    if (data.originalTransactionId) {
      const originalTx = await this.prisma.transaction.findFirst({
        where: { id: data.originalTransactionId, userId: senderId, deletedAt: null },
      });
      if (!originalTx) {
        throw new BadRequestException('Transação original não encontrada ou não pertence ao remetente');
      }
    }

    // 2. Check if recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { email: data.recipientEmail },
    });

    // 3. Create the invite (even if recipient doesn't exist yet, we store the email)
    const invite = await this.prisma.transactionInvite.create({
      data: {
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        type: data.type,
        senderId,
        recipientEmail: data.recipientEmail,
        recipientId: recipient?.id,
        originalTransactionId: data.originalTransactionId,
      },
    });

    // 3. If recipient exists, notify them
    if (recipient) {
      const sender = await this.prisma.user.findUnique({
        where: { id: senderId },
      });
      await this.notifications.create(recipient.id, {
        title: 'Novo pedido de lançamento',
        message: `${sender?.name || sender?.email} vinculou uma transação de R$ ${data.amount.toLocaleString('pt-BR')} com você.`,
        type: 'INVITE_RECEIVED',
        metadata: { inviteId: invite.id },
      });
    }

    return invite;
  }

  async findAllReceived(userId: string) {
    return this.prisma.transactionInvite.findMany({
      where: { recipientId: userId, status: 'PENDING' },
      include: { sender: { select: { name: true, email: true } } },
    });
  }

  async acceptInvite(
    inviteId: string,
    userId: string,
    accountId: string,
    categoryId: string,
  ) {
    const invite = await this.prisma.transactionInvite.findFirst({
      where: { id: inviteId, recipientId: userId, status: 'PENDING' },
    });

    if (!invite)
      throw new NotFoundException('Convite não encontrado ou já processado');

    return this.prisma.$transaction(async (tx) => {
      // Verify that accountId belongs to this user AND lock the row (FOR UPDATE)
      let account: Awaited<ReturnType<typeof tx.account.findFirst>> = null;
      if (accountId) {
        account = await tx.account.findFirst({
          where: { id: accountId, userId, deletedAt: null },
        });
        if (!account) {
          throw new BadRequestException('Conta não encontrada ou não pertence ao usuário');
        }
      }

      // Verify that categoryId belongs to this user
      if (categoryId) {
        const category = await tx.category.findFirst({
          where: { id: categoryId, userId, deletedAt: null },
        });
        if (!category) {
          throw new BadRequestException('Categoria não encontrada ou não pertence ao usuário');
        }
      }

      // Overdraft check: if EXPENSE, verify sufficient balance
      if (invite.type === 'EXPENSE' && account) {
        const inviteAmount = Number(invite.amount);
        if (Number(account.balance) < inviteAmount) {
          throw new BadRequestException('Saldo insuficiente na conta para esta despesa');
        }
      }

      // 1. Create the mirrored transaction
      // Mantemos o mesmo tipo original: uma Despesa de Pizza compartilhada é Despesa para ambos.

      await tx.transaction.create({
        data: {
          userId,
          accountId,
          categoryId,
          amount: Number(invite.amount),
          description: invite.description,
          date: invite.date,
          type: invite.type,
        },
      });

      // Atualizar Saldo da Conta
      const inviteAmount = Number(invite.amount);
      const adjustment =
        invite.type === 'INCOME' ? inviteAmount : -inviteAmount;
      await tx.account.updateMany({
        where: { id: accountId, userId },
        data: { balance: { increment: adjustment } },
      });

      // 2. Update invite status
      await tx.transactionInvite.update({
        where: { id: inviteId },
        data: { status: 'ACCEPTED' },
      });

      // 3. Notify sender
      const recipient = await tx.user.findUnique({ where: { id: userId } });
      await this.notifications.create(invite.senderId, {
        title: 'Lançamento Aceito',
        message: `${recipient?.name || recipient?.email} aceitou seu lançamento compartilhado de R$ ${inviteAmount.toLocaleString('pt-BR')}.`,
        type: 'INVITE_ACCEPTED',
        metadata: { inviteId: invite.id },
      });

      return { success: true };
    });
  }

  async rejectInvite(inviteId: string, userId: string) {
    const invite = await this.prisma.transactionInvite.findFirst({
      where: { id: inviteId, recipientId: userId, status: 'PENDING' },
    });

    if (!invite) throw new NotFoundException('Convite não encontrado');

    return this.prisma.transactionInvite.update({
      where: { id: inviteId },
      data: { status: 'REJECTED' },
    });
  }
}
