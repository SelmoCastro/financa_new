
import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) { }

  create(createTransactionDto: CreateTransactionDto, userId: string) {
    return this.prisma.transaction.create({
      data: {
        ...createTransactionDto,
        amount: Number(createTransactionDto.amount), // Ensure number
        date: new Date(createTransactionDto.date),   // Ensure Date object
        userId,
      },
    });
  }

  findAll(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });
  }

  async getDashboardSummary(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // 1. Calculate General Balance (All time)
    const balanceAgg = await this.prisma.transaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    // This simple sum assumes INCOME is positive and EXPENSE is negative in DB?
    // Wait, the schema shows 'type' field ('INCOME' | 'EXPENSE') and amount is Float.
    // Usually amount is stored absolute. We need to sum separately or condition.
    // Prisma aggregate doesn't support conditional sum easily in one go without raw query.
    // Let's do two aggregates or stick to raw query for best perf.

    // Group by Type for Balance
    const balanceGroup = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId },
      _sum: { amount: true },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    balanceGroup.forEach(g => {
      if (g.type === 'INCOME') totalIncome += (g._sum.amount || 0);
      else if (g.type === 'EXPENSE') totalExpense += (g._sum.amount || 0);
    });

    const balance = totalIncome - totalExpense;

    // 2. Current Month Totals
    const currentMonthGroup = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { amount: true },
    });

    let currentIncome = 0;
    let currentExpense = 0;

    currentMonthGroup.forEach(g => {
      if (g.type === 'INCOME') currentIncome += (g._sum.amount || 0);
      else if (g.type === 'EXPENSE') currentExpense += (g._sum.amount || 0);
    });

    // 3. Rule 50/30/20 (Expenses only, current month)
    const categoryGroup = await this.prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { amount: true },
    });

    const needsCategories = ['Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Educação', 'Contas e Serviços'];
    const wantsCategories = ['Lazer', 'Outros', 'Compras', 'Restaurantes', 'Assinaturas', 'Viagem', 'Cuidados Pessoais', 'Presentes'];
    const savingsCategories = ['Investimentos (Aporte)', 'Dívidas/Financiamentos'];

    let needs = 0;
    let wants = 0;
    let savings = 0;

    categoryGroup.forEach(g => {
      const cat = g.category;
      const val = g._sum.amount || 0;

      if (needsCategories.includes(cat)) needs += val;
      else if (wantsCategories.includes(cat)) wants += val;
      else if (savingsCategories.includes(cat)) savings += val;
      else wants += val;
    });

    const incomeBase = currentIncome || 1;

    return {
      balance,
      currentMonth: {
        income: currentIncome,
        expense: currentExpense
      },
      rule503020: {
        needs: { value: needs, percent: (needs / incomeBase) * 100 },
        wants: { value: wants, percent: (wants / incomeBase) * 100 },
        savings: { value: savings, percent: (savings / incomeBase) * 100 }
      }
    };
  }

  async export(userId: string): Promise<string> {
    const transactions = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    // CSV Header
    const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria'];
    const rows = transactions.map(t => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const amount = t.amount.toString().replace('.', ','); // Excel PT-BR uses comma for decimals
      const type = t.type === 'INCOME' ? 'Receita' : 'Despesa';
      return [date, `"${t.description}"`, amount, type, `"${t.category}"`].join(';');
    });

    return [headers.join(';'), ...rows].join('\n');
  }

  findOne(id: string, userId: string) {
    return this.prisma.transaction.findFirst({
      where: { id, userId },
    });
  }

  update(id: string, updateTransactionDto: UpdateTransactionDto, userId: string) {
    return this.prisma.transaction.updateMany({
      where: { id, userId }, // basic security check
      data: {
        ...updateTransactionDto,
        amount: updateTransactionDto.amount ? Number(updateTransactionDto.amount) : undefined,
        date: updateTransactionDto.date ? new Date(updateTransactionDto.date) : undefined,
      },
    });
  }

  remove(id: string, userId: string) {
    return this.prisma.transaction.deleteMany({
      where: { id, userId },
    });
  }
}
