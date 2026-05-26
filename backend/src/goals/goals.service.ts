import { Injectable, ForbiddenException } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService, PLAN_LIMITS } from '../subscription/subscription.service';
import { EncryptionService } from '../common/services/encryption.service';
import { encryptAmount, decryptAmount } from '../common/services/balance-helper';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
    private encryption: EncryptionService,
  ) {}

  async create(createGoalDto: CreateGoalDto, userId: string) {
    // V16: Atomic limit check + create to prevent race conditions
    return this.subscriptionService.createWithLimitCheck(userId, 'goal', async () => {
      const { deadline, targetAmount, currentAmount, ...rest } = createGoalDto;
      return this.prisma.goal.create({
        data: {
          ...rest,
          targetAmount: encryptAmount(targetAmount, this.encryption),
          currentAmount: currentAmount ? encryptAmount(currentAmount, this.encryption) : encryptAmount(0, this.encryption),
          deadline: deadline ? new Date(deadline) : undefined,
          userId,
        },
      });
    });
  }

  findAll(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string, userId: string) {
    return this.prisma.goal.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  update(id: string, updateGoalDto: UpdateGoalDto, userId: string) {
    const { targetAmount, ...rest } = updateGoalDto;
    const data: Record<string, any> = { ...rest };
    if (targetAmount !== undefined) data.targetAmount = encryptAmount(targetAmount, this.encryption);
    
    return this.subscriptionService.checkNotExceeding(userId, 'goal', id).then(() =>
      this.prisma.goal.updateMany({
        where: { id, userId, deletedAt: null },
        data,
      }),
    );
  }

  remove(id: string, userId: string) {
    return this.subscriptionService.checkNotExceeding(userId, 'goal', id).then(() =>
      this.prisma.goal.updateMany({
        where: { id, userId, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
    );
  }
}
