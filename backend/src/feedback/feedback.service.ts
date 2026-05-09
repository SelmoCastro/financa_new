import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

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
    // AdminGuard already verified admin status at controller level

    return this.prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteFeedback(id: string, _adminId: string) {
    // AdminGuard already verified admin status at controller level
    return this.prisma.feedback.delete({
      where: { id },
    });
  }
}
