import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionService, PLAN_LIMITS } from '../subscription/subscription.service';

@Injectable()
export class BudgetsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async create(createBudgetDto: CreateBudgetDto, userId: string) {
    // V15: Check budget limit based on plan
    const plan = await this.subscriptionService.getPlan(userId);
    const limits = PLAN_LIMITS[plan];
    const currentCount = await this.prisma.budget.count({
      where: { userId },
    });
    if (limits.maxBudgets !== -1 && currentCount >= limits.maxBudgets) {
      throw new ForbiddenException(
        `Limite de ${limits.maxBudgets} orçamentos atingido. Faça upgrade para Premium para orçamentos ilimitados.`,
      );
    }

    const { categoryId, amount } = createBudgetDto;

    // Verify category exists, belongs to user, and is not soft-deleted
    const cat = await this.prisma.category.findFirst({
      where: { id: categoryId, userId, deletedAt: null },
    });
    if (!cat) {
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
      where: { userId, deletedAt: null },
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
            deletedAt: null,
            date: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
        });

        const spent = Number(expenses._sum.amount || 0);
        const budgetAmount = Number(budget.amount);
        const percentage = (spent / budgetAmount) * 100;

        return {
          ...budget,
          spent,
          percentage: Math.min(percentage, 100),
          isOverBudget: spent > budgetAmount,
        };
      }),
    );

    return budgetsWithUsage;
  }

  async update(id: string, updateBudgetDto: UpdateBudgetDto, userId: string) {
    await this.subscriptionService.checkNotExceeding(userId, 'budget', id);
    const data: Record<string, unknown> = { ...updateBudgetDto };

    if (data.amount) {
      data.amount = Number(data.amount);
    }

    // If categoryId is being updated, verify it exists, belongs to user, and is not soft-deleted
    if (data.categoryId) {
      const cat = await this.prisma.category.findFirst({
        where: { id: data.categoryId, userId, deletedAt: null },
      });
      if (!cat) {
        throw new BadRequestException('Category not found');
      }
    }

    await this.prisma.budget.updateMany({
      where: { id, userId, deletedAt: null },
      data,
    });
    return this.prisma.budget.findFirst({
      where: { id, userId, deletedAt: null },
      include: { categoryObj: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.subscriptionService.checkNotExceeding(userId, 'budget', id);
    return this.prisma.budget.updateMany({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}