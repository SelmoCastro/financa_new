import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SocialService {
    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
    ) { }

    async sendInvite(senderId: string, data: {
        amount: number;
        description: string;
        date: string;
        type: string;
        recipientEmail: string;
        originalTransactionId?: string;
    }) {
        // 1. Check if recipient exists
        const recipient = await this.prisma.user.findUnique({
            where: { email: data.recipientEmail },
        });

        // 2. Create the invite (even if recipient doesn't exist yet, we store the email)
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
            const sender = await this.prisma.user.findUnique({ where: { id: senderId } });
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

    async acceptInvite(inviteId: string, userId: string, accountId: string, categoryId: string) {
        const invite = await this.prisma.transactionInvite.findFirst({
            where: { id: inviteId, recipientId: userId, status: 'PENDING' },
        });

        if (!invite) throw new NotFoundException('Convite não encontrado ou já processado');

        return this.prisma.$transaction(async (tx) => {
            // 1. Create the mirrored transaction
            // INVERT TYPE: Sender Expense -> Recipient Income | Sender Income -> Recipient Expense
            const mirroredType = invite.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE';

            await tx.transaction.create({
                data: {
                    userId,
                    accountId,
                    categoryId,
                    amount: invite.amount,
                    description: invite.description,
                    date: invite.date,
                    type: mirroredType,
                },
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
                message: `${recipient?.name || recipient?.email} aceitou seu lançamento compartilhado de R$ ${invite.amount.toLocaleString('pt-BR')}.`,
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
