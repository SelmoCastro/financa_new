import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  async create(createBudgetDto: CreateBudgetDto, userId: string) {
    const { categoryId, amount } = createBudgetDto;

    // Verify category exists and belongs to user
    const cat = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!cat || cat.userId !== userId) {
      throw new BadRequestException('Category not found');
    }

    // Upsert: update amount if budget for this category already exists, or create new
    return this.prisma.budget.upsert({
      where: {
        userId_categoryId: {
          userId,
          categoryId,
        },
      },
      update: { amount: Number(amount) },
      create: {
        userId,
        categoryId,
        amount: Number(amount),
      },
    });
  }

  async findAll(userId: string, year?: number, month?: number) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      orderBy: { amount: 'desc' },
      include: { categoryObj: true },
    });

    const now = new Date();
    const targetYear = year !== undefined ? year : now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth();

    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1));
    const endOfMonth = new Date(
      Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999),
    );

    // Calculate usage for each budget
    const budgetsWithUsage = await Promise.all(
      budgets.map(async (budget) => {
        const expenses = await this.prisma.transaction.aggregate({
          _sum: { amount: true },
          where: {
            userId,
            type: 'EXPENSE',
            categoryId: budget.categoryId,
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        });

        const spent = expenses._sum.amount || 0;
        const percentage = (spent / budget.amount) * 100;

        return {
          ...budget,
          spent,
          percentage: Math.min(percentage, 100),
          isOverBudget: spent > budget.amount,
        };
      }),
    );

    return budgetsWithUsage;
  }

  async update(id: string, updateBudgetDto: UpdateBudgetDto, userId: string) {
    const data: any = { ...updateBudgetDto };

    if (data.amount) {
      data.amount = Number(data.amount);
    }

    // If categoryId is being updated, verify it exists and belongs to user
    if (data.categoryId) {
      const cat = await this.prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!cat || cat.userId !== userId) {
        throw new BadRequestException('Category not found');
      }
    }

    await this.prisma.budget.updateMany({
      where: { id, userId },
      data,
    });
    return this.prisma.budget.findFirst({
      where: { id, userId },
      include: { categoryObj: true },
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.budget.deleteMany({
      where: { id, userId },
    });
  }
}