import { Injectable } from '@nestjs/common';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) { }

  async create(createBudgetDto: CreateBudgetDto, userId: string) {
    // Upsert: Reset amount if exists, or create new
    return this.prisma.budget.upsert({
      where: {
        userId_category: {
          userId,
          category: createBudgetDto.category
        }
      },
      update: { amount: Number(createBudgetDto.amount) },
      create: {
        userId,
        category: createBudgetDto.category,
        amount: Number(createBudgetDto.amount)
      }
    });
  }

  async findAll(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      orderBy: { amount: 'desc' }
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Calculate usage for each budget
    const budgetsWithUsage = await Promise.all(budgets.map(async (budget) => {
      const expenses = await this.prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'EXPENSE',
          OR: [
            { categoryLegacy: budget.category },
            { category: { name: budget.category } }
          ],
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      });

      const spent = expenses._sum.amount || 0;
      const percentage = (spent / budget.amount) * 100;

      return {
        ...budget,
        spent,
        percentage: Math.min(percentage, 100), // Cap for UI but maybe show >100% logic separate
        isOverBudget: spent > budget.amount
      };
    }));

    return budgetsWithUsage;
  }

  // Not used yet, but kept stubbed
  findOne(id: number) { return `This action returns a #${id} budget`; }

  async update(id: string, updateBudgetDto: UpdateBudgetDto, userId: string) {
    if (updateBudgetDto.amount) {
      updateBudgetDto.amount = Number(updateBudgetDto.amount);
    }
    await this.prisma.budget.updateMany({
      where: { id, userId },
      data: updateBudgetDto
    });
    return this.prisma.budget.findFirst({ where: { id, userId } });
  }

  async remove(id: string, userId: string) {
    return this.prisma.budget.deleteMany({
      where: { id, userId }
    });
  }
}
