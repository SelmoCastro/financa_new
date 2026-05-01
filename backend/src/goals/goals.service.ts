import { Injectable, ForbiddenException } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService, PLAN_LIMITS } from '../subscription/subscription.service';

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async create(createGoalDto: CreateGoalDto, userId: string) {
    // V16: Check goal limit based on plan
    const plan = await this.subscriptionService.getPlan(userId);
    const limits = PLAN_LIMITS[plan];
    const currentCount = await this.prisma.goal.count({
      where: { userId, deletedAt: null },
    });
    if (limits.maxGoals !== -1 && currentCount >= limits.maxGoals) {
      throw new ForbiddenException(
        `Limite de ${limits.maxGoals} metas atingido. Faça upgrade para Premium para metas ilimitadas.`,
      );
    }

    const { deadline, ...rest } = createGoalDto;
    return this.prisma.goal.create({
      data: {
        ...rest,
        deadline: deadline ? new Date(deadline) : undefined, // Explicit conversion
        userId,
      },
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
    return this.prisma.goal.updateMany({
      where: { id, userId, deletedAt: null },
      data: updateGoalDto,
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.goal.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
