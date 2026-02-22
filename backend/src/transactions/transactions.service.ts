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

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    const amount = Number(createTransactionDto.amount);
    const date = new Date(createTransactionDto.date);
    const { type, accountId } = createTransactionDto;

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          ...createTransactionDto,
          amount,
          date,
          userId,
        },
      });

      if (accountId) {
        const adjustment = type === 'INCOME' ? amount : (type === 'EXPENSE' ? -amount : 0);
        if (adjustment !== 0) {
          await tx.account.updateMany({
            where: { id: accountId, userId },
            data: { balance: { increment: adjustment } },
          });
        }
      }

      return transaction;
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

    return this.prisma.$transaction(async (tx) => {
      // Get existing fitIds in the batch
      const fitIds = transactionsData.map(t => t.fitId).filter(Boolean);
      let existingFitIds = new Set<string>();
      if (fitIds.length > 0) {
        const existing = await tx.transaction.findMany({
          where: { userId, fitId: { in: fitIds } },
          select: { fitId: true }
        });
        existingFitIds = new Set(existing.map(e => e.fitId!));
      }

      const toInsert = transactionsData
        .filter(t => !(t.fitId && existingFitIds.has(t.fitId)))
        .map(t => ({
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

      if (toInsert.length === 0) return { importedCount: 0 };

      // Apenas transações com FITID novo (skipDuplicates age como fallback)
      const result = await tx.transaction.createMany({
        data: toInsert,
        skipDuplicates: true
      });

      // Calcular o delta consolidado por conta SOMENTE das que foram marcadas para inserção
      const accountDeltas: Record<string, number> = {};
      for (const t of toInsert) {
        if (t.accountId) {
          const adj = t.type === 'INCOME' ? t.amount : (t.type === 'EXPENSE' ? -t.amount : 0);
          accountDeltas[t.accountId] = (accountDeltas[t.accountId] || 0) + adj;
        }
      }

      for (const [accId, delta] of Object.entries(accountDeltas)) {
        if (delta !== 0) {
          await tx.account.updateMany({
            where: { id: accId, userId },
            data: { balance: { increment: delta } }
          });
        }
      }

      return { importedCount: result.count };
    });
  }


  findAll(userId: string, year?: number, month?: number) {
    let whereClause: any = { userId };

    if (year !== undefined && month !== undefined) {
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
      whereClause.date = {
        gte: startOfMonth,
        lte: endOfMonth
      };
    }

    return this.prisma.transaction.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
    });
  }

  async getDashboardSummary(userId: string, year?: number, month?: number) {
    const now = new Date();
    const targetYear = year !== undefined ? year : now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth(); // 0-indexed month

    const startOfMonth = new Date(targetYear, targetMonth, 1);
    const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

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

  async update(id: string, updateTransactionDto: UpdateTransactionDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId }
      });

      if (!oldTx) return null;

      // 1. Reverter saldo antigo se houver accountId
      if (oldTx.accountId) {
        const revertAdj = oldTx.type === 'INCOME' ? -oldTx.amount : (oldTx.type === 'EXPENSE' ? oldTx.amount : 0);
        if (revertAdj !== 0) {
          await tx.account.updateMany({
            where: { id: oldTx.accountId, userId },
            data: { balance: { increment: revertAdj } }
          });
        }
      }

      // 2. Atualizar a transação
      const newAmount = updateTransactionDto.amount !== undefined ? Number(updateTransactionDto.amount) : oldTx.amount;
      const newType = updateTransactionDto.type || oldTx.type;

      let newAccountId = oldTx.accountId;
      if (updateTransactionDto.accountId !== undefined) {
        newAccountId = updateTransactionDto.accountId; // Pode ser null se o cliente remover a conta na edição
      }

      await tx.transaction.updateMany({
        where: { id, userId },
        data: {
          ...updateTransactionDto,
          amount: updateTransactionDto.amount ? Number(updateTransactionDto.amount) : undefined,
          date: updateTransactionDto.date ? new Date(updateTransactionDto.date) : undefined,
        }
      });

      // 3. Aplicar saldo novo se houver accountId
      if (newAccountId) {
        const applyAdj = newType === 'INCOME' ? newAmount : (newType === 'EXPENSE' ? -newAmount : 0);
        if (applyAdj !== 0) {
          await tx.account.updateMany({
            where: { id: newAccountId, userId },
            data: { balance: { increment: applyAdj } }
          });
        }
      }

      return tx.transaction.findFirst({ where: { id, userId } });
    });
  }

  async remove(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({
        where: { id, userId }
      });

      if (!oldTx) return { count: 0 };

      if (oldTx.accountId) {
        const revertAdj = oldTx.type === 'INCOME' ? -oldTx.amount : (oldTx.type === 'EXPENSE' ? oldTx.amount : 0);
        if (revertAdj !== 0) {
          await tx.account.updateMany({
            where: { id: oldTx.accountId, userId },
            data: { balance: { increment: revertAdj } }
          });
        }
      }

      return tx.transaction.deleteMany({
        where: { id, userId },
      });
    });
  }
}
