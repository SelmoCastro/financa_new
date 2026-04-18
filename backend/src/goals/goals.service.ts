import { Injectable } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  create(createGoalDto: CreateGoalDto, userId: string) {
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
