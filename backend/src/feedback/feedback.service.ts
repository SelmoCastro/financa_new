import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
    constructor(private prisma: PrismaService) { }

    async submitFeedback(userId: string, content: string, platform: string) {
        if (!content || !content.trim()) {
            throw new Error('Feedback content is required');
        }
        return this.prisma.feedback.create({
            data: {
                userId,
                content: content.trim(),
                platform: platform || 'UNKNOWN',
            },
        });
    }

    async findAllFeedbacks(userId: string) {
        console.log(`[Feedback] Searching for user ID: ${userId}`);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isAdmin: true },
        });

        console.log(`[Feedback] User Found. isAdmin? ${user?.isAdmin}`);

        if (!user || !user.isAdmin) {
            throw new ForbiddenException('Only administrators can access the feedback list');
        }

        return this.prisma.feedback.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                    }
                }
            }
        });
    }

    async deleteFeedback(id: string, adminId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: adminId },
            select: { isAdmin: true },
        });

        if (!user || !user.isAdmin) {
            throw new ForbiddenException('Only administrators can delete feedback');
        }

        return this.prisma.feedback.delete({
            where: { id }
        });
    }
}
