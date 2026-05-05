import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';

@Injectable()
export class RecurringTransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRecurringTransactionDto, userId: string) {
    // Validate FK ownership
    if (dto.accountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.accountId, userId, deletedAt: null },
      });
      if (!account) throw new BadRequestException('Conta não encontrada ou não pertence a este usuário');
    }
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, userId, deletedAt: null },
      });
      if (!category) throw new BadRequestException('Categoria não encontrada ou não pertence a este usuário');
    }
    if (dto.creditCardId) {
      const card = await this.prisma.creditCard.findFirst({
        where: { id: dto.creditCardId, userId, deletedAt: null },
      });
      if (!card) throw new BadRequestException('Cartão não encontrado ou não pertence a este usuário');
    }

    return this.prisma.recurringTransaction.create({
      data: {
        ...dto,
        userId,
      },
      include: { category: true, account: true, creditCard: true },
    });
  }

  async findAll(userId: string) {
    return this.prisma.recurringTransaction.findMany({
      where: { userId },
      include: { category: true, account: true, creditCard: true },
      orderBy: { dueDay: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const rt = await this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
      include: { category: true, account: true, creditCard: true },
    });
    if (!rt) throw new NotFoundException('Recorrente não encontrado');
    return rt;
  }

  async update(id: string, dto: UpdateRecurringTransactionDto, userId: string) {
    await this.findOne(id, userId);
    return this.prisma.recurringTransaction.update({
      where: { id },
      data: dto,
      include: { category: true, account: true, creditCard: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.recurringTransaction.delete({ where: { id } });
    return { deleted: true };
  }

  async toggle(id: string, userId: string) {
    const rt = await this.findOne(id, userId);
    return this.prisma.recurringTransaction.update({
      where: { id },
      data: { isActive: !rt.isActive },
      include: { category: true, account: true, creditCard: true },
    });
  }

  /**
   * Returns how much of the monthly income is consumed by active recurring expenses.
   */
  async getWeight(userId: string) {
    const [recorrentes, transactions] = await Promise.all([
      this.prisma.recurringTransaction.findMany({
        where: { userId, isActive: true, type: 'EXPENSE' },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: 'INCOME',
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        select: { amount: true },
      }),
    ]);

    const totalFixedExpense = recorrentes.reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    const monthlyIncome = transactions.reduce(
      (sum, t) => sum + Number(t.amount),
      0,
    ) || 1;

    return {
      totalFixedExpense: Math.round(totalFixedExpense * 100) / 100,
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      weight: Math.round((totalFixedExpense / monthlyIncome) * 100),
      count: recorrentes.length,
    };
  }
}
