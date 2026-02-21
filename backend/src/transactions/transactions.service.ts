import { Injectable } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService
  ) { }

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

  async validateImport(transactionsData: any[], userId: string) {
    if (!transactionsData || transactionsData.length === 0) return { valid: [], duplicateFitIds: [] };

    const fitIds = transactionsData.map(t => t.fitId).filter(Boolean);
    const targetAccountId = transactionsData[0]?.accountId;

    // 1. Silent Skip: Acha todos os FITIDs exatos já persistidos no banco.
    let existingFitIds = new Set<string>();
    if (fitIds.length > 0) {
      const existing = await this.prisma.transaction.findMany({
        where: { userId, fitId: { in: fitIds } },
        select: { fitId: true }
      });
      existingFitIds = new Set(existing.map(e => e.fitId!));
    }

    // 2. Fuzzy Hash (Mesma quantia e mesma data na mesma conta, mas FITID/Nome diferente)
    const minDate = new Date(Math.min(...transactionsData.map(t => new Date(t.date).getTime())));
    const maxDate = new Date(Math.max(...transactionsData.map(t => new Date(t.date).getTime())));

    const fuzzyExisting = await this.prisma.transaction.findMany({
      where: { userId, accountId: targetAccountId, date: { gte: minDate, lte: maxDate } },
      select: { date: true, amount: true }
    });

    const fuzzySet = new Set(
      fuzzyExisting.map(t => `${t.date.toISOString().split('T')[0]}_${t.amount}`)
    );

    const toReview: any[] = [];
    const descriptionsToClassify = new Set<string>();

    for (const raw of transactionsData) {
      if (raw.fitId && existingFitIds.has(raw.fitId)) {
        continue; // Silent Skip
      }

      const txDate = new Date(raw.date);
      const hash = `${txDate.toISOString().split('T')[0]}_${raw.amount}`;
      const isFuzzyDuplicate = fuzzySet.has(hash);

      // Adicionamos a UI flags
      toReview.push({
        ...raw,
        isFuzzyDuplicate, // Avisa a interface: "Tem algo desse dia com esse valor já!"
      });

      // Se a UI permitir, já pega o nome:
      descriptionsToClassify.add(raw.description);
    }

    // Camada 2 - IA
    let aiClassifications = {};
    if (descriptionsToClassify.size > 0) {
      aiClassifications = await this.aiService.classifyTransactions(Array.from(descriptionsToClassify));
    }

    // Merge IA results with the preview payload
    const finalPreview = toReview.map(tx => {
      const suggestion = aiClassifications[tx.description];
      return {
        ...tx,
        suggestedCategory: suggestion?.category || 'Outros',
        suggestedRule: suggestion?.rule || 30,
        suggestedIcon: suggestion?.icon || '🏷️'
      };
    });

    return {
      preview: finalPreview,
      skippedCount: transactionsData.length - toReview.length
    };
  }

  async confirmImport(transactionsData: any[], userId: string) {
    if (!transactionsData || transactionsData.length === 0) return { importedCount: 0 };

    const toInsert = transactionsData.map(t => ({
      description: t.description,
      amount: Number(t.amount),
      date: new Date(t.date),
      type: t.type,
      isFixed: t.isFixed || false,
      fitId: t.fitId,
      classificationRule: t.classificationRule || 30, // Default 30 - Desejos
      categoryId: t.categoryId,
      categoryLegacy: t.categoryLegacy,
      accountId: t.accountId,
      creditCardId: t.creditCardId,
      userId,
    }));

    const result = await this.prisma.transaction.createMany({
      data: toInsert,
      skipDuplicates: true // A barreira final. Impede erro se passar um fitId que já existe.
    });

    return { importedCount: result.count };
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
      by: ['categoryId', 'categoryLegacy'],
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

    const categories = await this.prisma.category.findMany({ where: { userId } });
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    categoryGroup.forEach(g => {
      const catName = (g.categoryId ? categoryMap.get(g.categoryId) : g.categoryLegacy) || 'Outros';
      const val = g._sum.amount || 0;

      if (needsCategories.includes(catName)) needs += val;
      else if (wantsCategories.includes(catName)) wants += val;
      else if (savingsCategories.includes(catName)) savings += val;
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
      include: { category: true }
    });

    // CSV Header
    const headers = ['Data', 'Descrição', 'Valor', 'Tipo', 'Categoria'];
    const rows = transactions.map(t => {
      const date = new Date(t.date).toLocaleDateString('pt-BR');
      const amount = t.amount.toString().replace('.', ','); // Excel PT-BR uses comma for decimals
      const type = t.type === 'INCOME' ? 'Receita' : 'Despesa';
      const categoryName = t.category?.name || t.categoryLegacy || 'Sem categoria';
      return [date, `"${t.description}"`, amount, type, `"${categoryName}"`].join(';');
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
