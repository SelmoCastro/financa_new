import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, data: { title: string; message: string; type: string; metadata?: any }) {
        return this.prisma.notification.create({
            data: {
                userId,
                title: data.title,
                message: data.message,
                type: data.type,
                metadata: data.metadata || {},
            },
        });
    }

    async findAll(userId: string) {
        return this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 20, // Keep it light
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
}
