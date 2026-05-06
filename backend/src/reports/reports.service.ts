import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardSummary(userId: string, year?: number, month?: number) {
    const now = new Date();
    const targetYear = year !== undefined ? year : now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth(); // 0-indexed month

    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1));
    const endOfMonth = new Date(
      Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999),
    );

    // Identify real transfer transactions by description pattern
    // The /transfer endpoint creates transactions with "(Entrada)" and "(Saída)" suffixes
    // We exclude ONLY these, NOT all transactions with transfer-related category names
    // (many real PIX payments get classified as "Transferência Recebida" but ARE real income/expense)
    const filterOutTransfers = {
      NOT: {
        OR: [
          { description: { contains: '(Entrada)' } },
          { description: { contains: '(Saída)' } },
        ],
      },
    };

    // 1. Calculate General Balance (All time)
    // O "Saldo Atual" reflete fielmente o saldo em caixa (soma do balance das contas),
    // ao invés de somar/subtrair todo histórico de transações que afasta o número real.
    const userAccounts = await this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      select: { balance: true },
    });

    const balance = userAccounts.reduce(
      (acc, account) => acc + Number(account.balance),
      0,
    );

    // 2. Current Month Totals
    const currentMonthGroup = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        deletedAt: null,
        ...filterOutTransfers,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    });

    let currentIncome = 0;
    let currentExpense = 0;

    currentMonthGroup.forEach((g) => {
      if (g.type === 'INCOME') currentIncome += Number(g._sum.amount || 0);
      else if (g.type === 'EXPENSE') currentExpense += Number(g._sum.amount || 0);
    });

    // 2.5 Calculate Previous Month for Trends
    const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
    const startOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 1));
    const endOfPrevMonth = new Date(
      Date.UTC(prevYear, prevMonth + 1, 0, 23, 59, 59, 999),
    );

    const prevMonthGroup = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        userId,
        deletedAt: null,
        ...filterOutTransfers,
        date: {
          gte: startOfPrevMonth,
          lte: endOfPrevMonth,
        },
      },
      _sum: { amount: true },
    });

    let prevIncome = 0;
    let prevExpense = 0;

    prevMonthGroup.forEach((g) => {
      if (g.type === 'INCOME') prevIncome += Number(g._sum.amount || 0);
      else if (g.type === 'EXPENSE') prevExpense += Number(g._sum.amount || 0);
    });

    const incomeTrend =
      prevIncome === 0 && currentIncome > 0
        ? 100
        : prevIncome === 0
          ? 0
          : ((currentIncome - prevIncome) / prevIncome) * 100;
    const expenseTrend =
      prevExpense === 0 && currentExpense > 0
        ? 100
        : prevExpense === 0
          ? 0
          : ((currentExpense - prevExpense) / prevExpense) * 100;

    // 3. Rule 50/30/20 (Expenses only, current month)
    const categoryGroup = await this.prisma.transaction.groupBy({
      by: ['categoryId', 'categoryLegacy'],
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        ...filterOutTransfers,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    });

    // Canonical category name mappings (legacy names → standard names)
    // This handles old transactions created before category standardization
    // and categories that exist with different names in user data
    const categoryAliases: Record<string, string> = {
      // Legacy/old names that don't match STANDARD_CATEGORIES exactly
      'Assinaturas': 'Lazer / Assinaturas',
      'Lazer': 'Lazer / Assinaturas',
      'Alimentação': 'Mercado / Padaria',
      'Mercado': 'Mercado / Padaria',
      'Transporte': 'Transporte Fixo',
      'Compras': 'Compras / Vestuário',
      'Saúde': 'Saúde e Farmácia',
      'Moradia': 'Moradia',
      'Contas': 'Contas Residenciais',
      'Contas e Serviços': 'Contas Residenciais',
      'Educação': 'Educação',
      'Investimentos (Aporte)': 'Aplicações / Poupança',
      'Investimentos': 'Aplicações / Poupança',
      'Poupança': 'Aplicações / Poupança',
      'Dívidas': 'Pagamento de Dívidas',
      'Celular': 'Contas Residenciais',
      'Manutenção Veicular': 'Transporte Fixo',
      // Previously uncategorized legacy names → proper classification
      'Roupas': 'Compras / Vestuário',
      'Cartao Credito': 'Compras / Vestuário',
      'Cuidados Pessoais': 'Cuidados Pessoais',
      // Transferência Recebida is type=TRANSFER, not a real expense
      // Outros/Outras Receitas/Entradas as expense category names → treat as generic
    };

    // Categories that are transfers/internal movements, not real expenses
    // These should be excluded from 50/30/20 calculations entirely
    const transferCategoryNames = ['Transferência Recebida', 'Transferência Enviada'];

    const needsCategories = [
      'Moradia',
      'Contas Residenciais',
      'Mercado / Padaria',
      'Transporte Fixo',
      'Combustível / Gasolina',
      'Saúde e Farmácia',
      'Educação',
      'Impostos Anuais e Seguros',
      'Impostos Mensais',
    ];
    const wantsCategories = [
      'Restaurante / Delivery',
      'Transporte App',
      'Lazer / Assinaturas',
      'Compras / Vestuário',
      'Cuidados Pessoais',
      'Cuidados com Pets',
      'Viagens',
      // Generic/catch-all categories that don't fit needs or savings
      'Outros',
      'Cartao Credito',
    ];
    const savingsCategories = ['Aplicações / Poupança', 'Pagamento de Dívidas'];

    let needs = 0;
    let wants = 0;
    let savings = 0;
    let uncategorized = 0;

    const categories = await this.prisma.category.findMany({
      where: { userId, deletedAt: null },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const classifyCategory = (catName: string): { name: string; isTransfer: boolean } => {
      // Normalize null/empty/undefined → Outros
      if (!catName || catName === 'null' || catName === 'undefined') return { name: 'Outros', isTransfer: false };
      // Check if this is a transfer category (should be excluded from 50/30/20)
      if (transferCategoryNames.includes(catName)) return { name: catName, isTransfer: true };
      // Apply alias mapping
      return { name: categoryAliases[catName] || catName, isTransfer: false };
    };

    // Legacy expense category names that are actually income/transfer misclassified
    // These should be excluded from 50/30/20 expense calculations
    const excludedExpenseCategories = ['Outras Receitas', 'Entradas', 'Rendimento de Investimentos'];

    categoryGroup.forEach((g) => {
      // Resolve category name: prefer categoryId lookup, fallback to categoryLegacy
      // Handle string 'null' as invalid legacy value
      const rawCatName =
        g.categoryId
          ? categoryMap.get(g.categoryId)
          : (g.categoryLegacy && g.categoryLegacy !== 'null' ? g.categoryLegacy : null);

      const classified = classifyCategory(rawCatName || 'Outros');

      // Skip transfer categories entirely
      if (classified.isTransfer) return;

      // Skip misclassified income/transfer categories that appear as EXPENSE
      if (excludedExpenseCategories.includes(rawCatName || '')) return;

      const catName = classified.name;
      const val = Number(g._sum.amount || 0);

      if (needsCategories.includes(catName)) needs += val;
      else if (wantsCategories.includes(catName)) wants += val;
      else if (savingsCategories.includes(catName)) savings += val;
      else uncategorized += val;
    });

    // 3. Rule 50/30/20 (Expenses as % of TOTAL EXPENSES, not income)
    // The original rule says: of your income, 50% to needs, 30% to wants, 20% to savings.
    // But displaying % of income makes the bars meaningless when spending < income.
    // Showing % of total expenses makes the 3 segments sum to ~100% and directly
    // comparable to the 50/30/20 targets.
    // If no expenses, we use 1 to avoid division by zero.
    const expenseBase = (needs + wants + savings + uncategorized) > 0
      ? (needs + wants + savings + uncategorized)
      : 1;

    // 4. Category Summary (Pie Chart Data)
    const categorySummary: { name: string; value: number }[] = [];
    categoryGroup.forEach((g) => {
      const rawCat =
        g.categoryId
          ? categoryMap.get(g.categoryId)
          : (g.categoryLegacy && g.categoryLegacy !== 'null' ? g.categoryLegacy : null);
      const classified = classifyCategory(rawCat || 'Outros');
      // Skip transfer categories from pie chart too
      if (classified.isTransfer) return;
      const catName = classified.name;
      const val = g._sum.amount ? Number(g._sum.amount) : 0;

      if (val > 0) {
        const existing = categorySummary.find((c) => c.name === catName);
        if (existing) {
          existing.value += val;
        } else {
          categorySummary.push({ name: catName, value: val });
        }
      }
    });
    categorySummary.sort((a, b) => b.value - a.value);

    // 5. Monthly History (Bar Chart Data)
    // Limit to last 12 months to avoid showing future dates and keep chart readable
    const twelveMonthsAgo = new Date(
      Date.UTC(now.getFullYear(), now.getMonth() - 11, 1),
    );
    const allTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        ...filterOutTransfers,
        date: {
          gte: twelveMonthsAgo,
        },
      },
      select: { date: true, amount: true, type: true },
      orderBy: { date: 'asc' },
    });

    const monthlyMap = new Map<
      string,
      { income: number; expenses: number; month: string }
    >();
    allTxs.forEach((t) => {
      // Use UTC consistently to avoid timezone drift
      const d = new Date(t.date);
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(monthKey)) {
        // Use UTC month name extraction to be robust
        const formatter = new Intl.DateTimeFormat('pt-BR', {
          month: 'short',
          timeZone: 'UTC',
        });
        const monthName = formatter.format(d);
        const formattedMonth =
          monthName.charAt(0).toUpperCase() + monthName.slice(1);
        monthlyMap.set(monthKey, {
          income: 0,
          expenses: 0,
          month: formattedMonth,
        });
      }
      const stats = monthlyMap.get(monthKey);
      if (t.type === 'INCOME') stats!.income += Number(t.amount);
      else if (t.type === 'EXPENSE') stats!.expenses += Number(t.amount);
    });

    // Sort chronologically and ensure proper month ordering
    const monthlyHistory = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);

    return {
      balance,
      currentMonth: {
        income: currentIncome,
        expense: currentExpense,
        incomeTrend,
        expenseTrend,
      },
      rule503020: {
        needs: {
          value: needs,
          percent: expenseBase > 1 ? (needs / expenseBase) * 100 : 0,
        },
        wants: {
          value: wants,
          percent: expenseBase > 1 ? (wants / expenseBase) * 100 : 0,
        },
        savings: {
          value: savings,
          percent: expenseBase > 1 ? (savings / expenseBase) * 100 : 0,
        },
        uncategorized: {
          value: uncategorized,
          percent: expenseBase > 1 ? (uncategorized / expenseBase) * 100 : 0,
        },
      },
      categorySummary,
      monthlyHistory,
    };
  }

  /**
   * Retorna um perfil completo para o "cérebro" da IA.
   * Inclui metas, orçamentos e principais gastos.
   * Pode usar dados específicos de um mês se `year` e `month` forem informados.
   */
  async getFinancialProfile(userId: string, year?: number, month?: number) {
    const now = new Date();
    const y = year !== undefined ? year : now.getFullYear();
    const m = month !== undefined ? month : now.getMonth();

    // Filter out transfer transactions (internal movements, not real expenses)
    const filterOutTransfers = {
      NOT: {
        OR: [
          { description: { contains: '(Entrada)' } },
          { description: { contains: '(Saída)' } },
        ],
      },
    };

    // 1. Resumo do mês atual ou selecionado
    const monthSummary = await this.getDashboardSummary(userId, y, m);

    // 2. Metas do usuário
    const goals = await this.prisma.goal.findMany({
      where: { userId, deletedAt: null },
      select: {
        title: true,
        targetAmount: true,
        currentAmount: true,
        deadline: true,
      },
    });

    // 3. Orçamentos vs Realizado
    const budgets = await this.prisma.budget.findMany({
      where: { userId, deletedAt: null },
      select: { categoryId: true, amount: true },
    });

    // 4. Maiores categorias de gasto no mês
    const targetStart = new Date(Date.UTC(y, m, 1));
    const targetEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    const topExpenses = await this.prisma.transaction.groupBy({
      by: ['categoryId', 'categoryLegacy'],
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        ...filterOutTransfers,
        date: {
          gte: targetStart,
          lte: targetEnd,
        },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 5,
    });

    const categories = await this.prisma.category.findMany({
      where: { userId, deletedAt: null },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    const formattedTopExpenses = topExpenses.map((g) => ({
      category:
        (g.categoryId ? categoryMap.get(g.categoryId) : g.categoryLegacy) ||
        'Outros',
      amount: Number(g._sum.amount || 0),
    }));

    // 5. Últimas 50 transações para contexto específico da IA
    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null },
      select: {
        description: true,
        amount: true,
        date: true,
        type: true,
      },
      orderBy: { date: 'desc' },
      take: 50,
    });

    return {
      userSummary: monthSummary,
      activeGoals: goals,
      activeBudgets: budgets,
      topMonthlyExpenses: formattedTopExpenses,
      recentTransactions,
    };
  }

  /**
   * Retorna um resumo histórico dos últimos 3 meses focado apenas nas despesas.
   * Ideal para contexto de Forecasting na Inteligência Artificial.
   */
  async getHistoricalSpending(userId: string) {
    const now = new Date();
    const startOfHistory = new Date(
      Date.UTC(now.getFullYear(), now.getMonth() - 3, 1),
    );
    const endOfHistory = new Date(
      Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    );

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        date: {
          gte: startOfHistory,
          lte: endOfHistory,
        },
      },
      select: {
        amount: true,
        date: true,
        categoryId: true,
        categoryLegacy: true,
      },
    });

    const categories = await this.prisma.category.findMany({
      where: { userId, deletedAt: null },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return transactions.map((t) => ({
      amount: Number(t.amount),
      date: t.date,
      category:
        (t.categoryId ? categoryMap.get(t.categoryId) : t.categoryLegacy) ||
        'Outros',
    }));
  }

  /**
   * Retorna até 100 transações de saída com descrição dos últimos 90 dias
   * Ideal para identificar assinaturas e custos ocultos via Inteligência Artificial.
   */
  async getRecentTransactionsForAudit(userId: string) {
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    return await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        date: {
          gte: ninetyDaysAgo,
          lte: now,
        },
      },
      select: {
        description: true,
        amount: true,
        date: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 100,
    });
  }
}
