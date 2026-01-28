import { Injectable } from '@nestjs/common';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) { }

  create(createGoalDto: CreateGoalDto, userId: string) {
    const { deadline, ...rest } = createGoalDto;
    return this.prisma.goal.create({
      data: {
        ...rest,
        deadline: deadline ? new Date(deadline) : undefined, // Explicit conversion
        userId
      }
    });
  }

  findAll(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  findOne(id: string, userId: string) {
    return this.prisma.goal.findFirst({
      where: { id, userId }
    });
  }

  update(id: string, updateGoalDto: UpdateGoalDto, userId: string) {
    return this.prisma.goal.updateMany({
      where: { id, userId },
      data: updateGoalDto
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.goal.deleteMany({
      where: { id, userId }
    });
  }
}
