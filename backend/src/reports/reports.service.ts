import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/services/encryption.service';
import { decryptAmount } from '../common/services/balance-helper';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  private dec(val: string | null | undefined): number {
    if (!val) return 0;
    return decryptAmount(val, this.encryption);
  }

  async getDashboardSummary(userId: string, year?: number, month?: number) {
    const now = new Date();
    let targetYear = year !== undefined ? year : now.getFullYear();
    let targetMonth = month !== undefined ? month : now.getMonth();

    // Auto-fallback: if the requested month has no transactions, scan backwards
    // to find the most recent month with data (up to 12 months)
    {
      const checkStart = new Date(Date.UTC(targetYear, targetMonth, 1));
      const checkEnd = new Date(
        Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999),
      );
      const checkTxs = await this.prisma.transaction.findFirst({
        where: {
          userId,
          deletedAt: null,
          transferGroupId: null,
          date: { gte: checkStart, lte: checkEnd },
        },
        select: { id: true },
      });
      if (!checkTxs) {
        // Empty month — scan backwards
        let sy = targetYear;
        let sm = targetMonth;
        for (let i = 1; i <= 12; i++) {
          sm--;
          if (sm < 0) { sm = 11; sy--; }
          const ss = new Date(Date.UTC(sy, sm, 1));
          const se = new Date(Date.UTC(sy, sm + 1, 0, 23, 59, 59, 999));
          const stx = await this.prisma.transaction.findFirst({
            where: {
              userId,
              deletedAt: null,
              transferGroupId: null,
              date: { gte: ss, lte: se },
            },
            select: { id: true },
          });
          if (stx) {
            targetYear = sy;
            targetMonth = sm;
            break;
          }
        }
      }
    }

    const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1));
    const endOfMonth = new Date(
      Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999),
    );

    const filterOutTransfers = {
      transferGroupId: null,
    };

    // 1. General Balance (sum of encrypted account balances)
    const userAccounts = await this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      select: { balance: true },
    });
    const balance = userAccounts.reduce(
      (acc, account) => acc + this.dec(account.balance),
      0,
    );

    // 2. Current Month Totals (manual sum since _sum doesn't work on encrypted strings)
    const currentMonthTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        ...filterOutTransfers,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { type: true, amount: true },
    });

    let currentIncome = 0;
    let currentExpense = 0;
    for (const t of currentMonthTxs) {
      const val = this.dec(t.amount);
      if (t.type === 'INCOME') currentIncome += val;
      else if (t.type === 'EXPENSE') currentExpense += val;
    }

    // 2.5 Previous Month for Trends
    const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
    const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
    const startOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 1));
    const endOfPrevMonth = new Date(
      Date.UTC(prevYear, prevMonth + 1, 0, 23, 59, 59, 999),
    );

    const prevMonthTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        ...filterOutTransfers,
        date: { gte: startOfPrevMonth, lte: endOfPrevMonth },
      },
      select: { type: true, amount: true },
    });

    let prevIncome = 0;
    let prevExpense = 0;
    for (const t of prevMonthTxs) {
      const val = this.dec(t.amount);
      if (t.type === 'INCOME') prevIncome += val;
      else if (t.type === 'EXPENSE') prevExpense += val;
    }

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

    // 3. Rule 50/30/20 (Expenses by category)
    const categoryTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        ...filterOutTransfers,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { categoryId: true, categoryLegacy: true, amount: true },
    });

    const categoryAliases: Record<string, string> = {
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
      'Roupas': 'Compras / Vestuário',
      'Cartao Credito': 'Compras / Vestuário',
      'Cuidados Pessoais': 'Cuidados Pessoais',
    };

    const transferCategoryNames = ['Transferência Recebida', 'Transferência Enviada'];

    const needsCategories = [
      'Moradia', 'Contas Residenciais', 'Mercado / Padaria',
      'Transporte Fixo', 'Combustível / Gasolina', 'Saúde e Farmácia',
      'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais',
    ];
    const wantsCategories = [
      'Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas',
      'Compras / Vestuário', 'Cuidados Pessoais', 'Cuidados com Pets',
      'Viagens', 'Outros', 'Cartao Credito',
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
      if (!catName || catName === 'null' || catName === 'undefined') return { name: 'Outros', isTransfer: false };
      if (transferCategoryNames.includes(catName)) return { name: catName, isTransfer: true };
      return { name: categoryAliases[catName] || catName, isTransfer: false };
    };

    const excludedExpenseCategories = ['Outras Receitas', 'Entradas', 'Rendimento de Investimentos'];

    // Build category sums manually
    const categorySums = new Map<string, number>();
    for (const t of categoryTxs) {
      const val = this.dec(t.amount);
      const rawCatName =
        t.categoryId
          ? categoryMap.get(t.categoryId)
          : (t.categoryLegacy && t.categoryLegacy !== 'null' ? t.categoryLegacy : null);

      const classified = classifyCategory(rawCatName || 'Outros');
      if (classified.isTransfer) continue;
      if (excludedExpenseCategories.includes(rawCatName || '')) continue;

      const catName = classified.name;
      categorySums.set(catName, (categorySums.get(catName) || 0) + val);

      if (needsCategories.includes(catName)) needs += val;
      else if (wantsCategories.includes(catName)) wants += val;
      else if (savingsCategories.includes(catName)) savings += val;
      else uncategorized += val;
    }

    const expenseBase = needs + wants + savings + uncategorized;

    // 4. Category Summary (Pie Chart)
    const categorySummary: { name: string; value: number }[] = [];
    for (const [name, val] of categorySums) {
      if (val > 0) categorySummary.push({ name, value: val });
    }
    categorySummary.sort((a, b) => b.value - a.value);

    // 5. Monthly History (Bar Chart)
    const twelveMonthsAgo = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11, 1));
    const allTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        ...filterOutTransfers,
        date: { gte: twelveMonthsAgo, lte: endOfMonth },
      },
      select: { date: true, amount: true, type: true },
      orderBy: { date: 'asc' },
    });

    const monthlyMap = new Map<string, { income: number; expenses: number; month: string }>();
    for (const t of allTxs) {
      const d = new Date(t.date);
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(monthKey)) {
        const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
        const monthName = formatter.format(d);
        monthlyMap.set(monthKey, {
          income: 0,
          expenses: 0,
          month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        });
      }
      const stats = monthlyMap.get(monthKey)!;
      const val = this.dec(t.amount);
      if (t.type === 'INCOME') stats.income += val;
      else if (t.type === 'EXPENSE') stats.expenses += val;
    }

    const monthlyHistory = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);

    // 6. Credit Card Debt
    const unpaidInvoices = await this.prisma.creditCardInvoice.findMany({
      where: { userId, isPaid: false },
      select: {
        id: true,
        creditCardId: true,
        referenceMonth: true,
        referenceYear: true,
        totalAmount: true,
        paidAmount: true,
        closingDate: true,
        dueDate: true,
        creditCard: { select: { name: true, deletedAt: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const validUnpaidInvoices = unpaidInvoices.filter(
      (inv) => inv.creditCard?.deletedAt === null,
    );

    const creditCards = await this.prisma.creditCard.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, closingDay: true, dueDay: true },
    });

    const closedCardIds = new Set(validUnpaidInvoices.map((inv) => inv.creditCardId));
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const openInvoices: Array<{
      id: string;
      creditCardId: string;
      creditCardName: string;
      referenceMonth: number;
      referenceYear: number;
      totalAmount: number;
      paidAmount: number;
      remaining: number;
      closingDate: Date;
      dueDate: Date;
    }> = [];

    for (const card of creditCards) {
      if (closedCardIds.has(card.id)) continue;
      // Manual sum since _sum doesn't work on encrypted strings
      const unlinkedTxs = await this.prisma.transaction.findMany({
        where: {
          userId,
          creditCardId: card.id,
          deletedAt: null,
          invoiceId: null,
          type: 'EXPENSE',
        },
        select: { amount: true },
      });
      const total = unlinkedTxs.reduce((sum, t) => sum + this.dec(t.amount), 0);
      if (total === 0) continue;

      const closingDate = new Date(currentYear, currentMonth - 1, card.closingDay);
      const dueDate = new Date(currentYear, currentMonth, card.dueDay);

      openInvoices.push({
        id: `open-${card.id}`,
        creditCardId: card.id,
        creditCardName: card.name,
        referenceMonth: currentMonth,
        referenceYear: currentYear,
        totalAmount: total,
        paidAmount: 0,
        remaining: total,
        closingDate,
        dueDate,
      });
    }

    const allPendingInvoices = [...validUnpaidInvoices.map((inv) => ({
      ...inv,
      remaining: this.dec(inv.totalAmount) - this.dec(inv.paidAmount),
      creditCardName: inv.creditCard.name,
    })), ...openInvoices];

    const creditCardDebt = allPendingInvoices.reduce(
      (sum, inv) => sum + (inv.remaining || (this.dec(inv.totalAmount as any) - this.dec(inv.paidAmount as any))),
      0,
    );

    return {
      balance,
      creditCardDebt,
      currentMonth: {
        income: currentIncome,
        expense: currentExpense,
        incomeTrend,
        expenseTrend,
      },
      rule503020: {
        needs: {
          value: needs,
          percent: expenseBase > 0 ? Math.round((needs / expenseBase) * 1000) / 10 : 0,
        },
        wants: {
          value: wants,
          percent: expenseBase > 0 ? Math.round((wants / expenseBase) * 1000) / 10 : 0,
        },
        savings: {
          value: savings,
          percent: expenseBase > 0 ? Math.round((savings / expenseBase) * 1000) / 10 : 0,
        },
        uncategorized: {
          value: uncategorized,
          percent: expenseBase > 0 ? Math.round((uncategorized / expenseBase) * 1000) / 10 : 0,
        },
      },
      categorySummary,
      monthlyHistory,
      pendingInvoices: allPendingInvoices,
    };
  }

  async getFinancialProfile(userId: string, year?: number, month?: number) {
    const now = new Date();
    const y = year !== undefined ? year : now.getFullYear();
    const m = month !== undefined ? month : now.getMonth();

    const filterOutTransfers = { transferGroupId: null };

    const monthSummary = await this.getDashboardSummary(userId, y, m);

    const goals = await this.prisma.goal.findMany({
      where: { userId, deletedAt: null },
      select: {
        title: true,
        targetAmount: true,
        currentAmount: true,
        deadline: true,
      },
    });

    const budgets = await this.prisma.budget.findMany({
      where: { userId, deletedAt: null },
      select: { categoryId: true, amount: true },
    });

    const targetStart = new Date(Date.UTC(y, m, 1));
    const targetEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    const topExpenseTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        ...filterOutTransfers,
        date: { gte: targetStart, lte: targetEnd },
      },
      select: { categoryId: true, categoryLegacy: true, amount: true },
      take: 500,
    });

    const categories = await this.prisma.category.findMany({
      where: { userId, deletedAt: null },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    // Aggregate manually and sort by amount desc
    const categoryAgg = new Map<string, number>();
    for (const t of topExpenseTxs) {
      const catName = (t.categoryId ? categoryMap.get(t.categoryId) : t.categoryLegacy) || 'Outros';
      categoryAgg.set(catName, (categoryAgg.get(catName) || 0) + this.dec(t.amount));
    }
    const formattedTopExpenses = Array.from(categoryAgg.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const recentTransactions = await this.prisma.transaction.findMany({
      where: { userId, deletedAt: null },
      select: { description: true, amount: true, date: true, type: true },
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

  async getHistoricalSpending(userId: string) {
    const now = new Date();
    const startOfHistory = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 3, 1));
    const endOfHistory = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        date: { gte: startOfHistory, lte: endOfHistory },
      },
      select: { amount: true, date: true, categoryId: true, categoryLegacy: true },
    });

    const categories = await this.prisma.category.findMany({
      where: { userId, deletedAt: null },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return transactions.map((t) => ({
      amount: this.dec(t.amount),
      date: t.date,
      category:
        (t.categoryId ? categoryMap.get(t.categoryId) : t.categoryLegacy) || 'Outros',
    }));
  }

  async getRecentTransactionsForAudit(userId: string) {
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    return await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        deletedAt: null,
        date: { gte: ninetyDaysAgo, lte: now },
      },
      select: { description: true, amount: true, date: true },
      orderBy: { date: 'desc' },
      take: 100,
    });
  }

  async getProjection(userId: string) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const userAccounts = await this.prisma.account.findMany({
      where: { userId, deletedAt: null },
      select: { balance: true },
    });
    const currentBalance = userAccounts.reduce(
      (acc, a) => acc + this.dec(a.balance),
      0,
    );

    const unpaidInvoices = await this.prisma.creditCardInvoice.findMany({
      where: { userId, isPaid: false },
    });
    const creditCardDebt = unpaidInvoices.reduce(
      (sum, inv) => sum + this.dec(inv.totalAmount) - this.dec(inv.paidAmount),
      0,
    );

    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const endOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59, 999));

    const activeRecurring = await this.prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
        OR: [{ endMonth: null }, { endMonth: { gte: currentMonth + 1 } }],
      },
    });

    const confirmedDescriptions = await this.prisma.transaction.findMany({
      where: {
        userId,
        isFixed: true,
        deletedAt: null,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      select: { description: true },
    });
    const confirmedSet = new Set(confirmedDescriptions.map((t) => t.description.toLowerCase().trim()));

    const upcomingIncome = activeRecurring
      .filter((r) => r.type === 'INCOME' && !confirmedSet.has(r.description.toLowerCase().trim()))
      .reduce((sum, r) => sum + this.dec(r.amount), 0);

    const upcomingExpenses = activeRecurring
      .filter((r) => r.type === 'EXPENSE' && !confirmedSet.has(r.description.toLowerCase().trim()))
      .reduce((sum, r) => sum + this.dec(r.amount), 0);

    const projectedBalance = currentBalance + upcomingIncome - upcomingExpenses - creditCardDebt;

    const days: Array<{ date: string; balance: number; events: string[] }> = [];
    const startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    const recentTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate },
      },
      select: { date: true, type: true, amount: true, description: true },
      orderBy: { date: 'asc' },
    });

    const txByDate = new Map<string, { type: string; amount: number; desc: string }[]>();
    for (const tx of recentTxs) {
      const key = tx.date.toISOString().split('T')[0];
      if (!txByDate.has(key)) txByDate.set(key, []);
      txByDate.get(key)!.push({ type: tx.type, amount: this.dec(tx.amount), desc: tx.description });
    }

    // Manual sum instead of aggregate _sum
    const incomeBeforeTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        accountId: { not: null },
        deletedAt: null,
        date: { lt: startDate },
        type: 'INCOME',
      },
      select: { amount: true },
    });
    const expenseBeforeTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        accountId: { not: null },
        deletedAt: null,
        date: { lt: startDate },
        type: 'EXPENSE',
      },
      select: { amount: true },
    });
    let runningBalance = incomeBeforeTxs.reduce((s, t) => s + this.dec(t.amount), 0)
      - expenseBeforeTxs.reduce((s, t) => s + this.dec(t.amount), 0);

    for (let i = 0; i < 30; i++) {
      const day = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const dayKey = day.toISOString().split('T')[0];
      const dayDueDay = day.getDate();
      const dayMonth = day.getMonth() + 1;

      const events: string[] = [];

      const dayTxs = txByDate.get(dayKey) || [];
      for (const tx of dayTxs) {
        if (tx.type === 'INCOME') {
          runningBalance += tx.amount;
          events.push(`+ ${tx.desc}: R$${tx.amount.toFixed(2)}`);
        } else {
          runningBalance -= tx.amount;
          events.push(`- ${tx.desc}: R$${tx.amount.toFixed(2)}`);
        }
      }

      if (day >= now) {
        const dayItems = activeRecurring.filter(
          (r) => r.dueDay === dayDueDay && !confirmedSet.has(r.description.toLowerCase().trim()),
        );
        for (const item of dayItems) {
          const val = this.dec(item.amount);
          if (item.type === 'INCOME') {
            runningBalance += val;
            events.push(`+ ${item.description}: R$${val.toFixed(2)}`);
          } else {
            runningBalance -= val;
            events.push(`- ${item.description}: R$${val.toFixed(2)}`);
          }
        }

        for (const inv of unpaidInvoices) {
          const dueDate = new Date(inv.dueDate);
          if (dueDate.getDate() === dayDueDay && dueDate.getMonth() + 1 === dayMonth) {
            const remaining = this.dec(inv.totalAmount) - this.dec(inv.paidAmount);
            if (remaining > 0) {
              events.push(`Fatura cartão vence: R$${remaining.toFixed(2)}`);
            }
          }
        }
      }

      days.push({ date: dayKey, balance: runningBalance, events });
    }

    return {
      currentBalance,
      upcomingIncome,
      upcomingExpenses,
      creditCardDebt,
      projectedBalance,
      days,
      upcomingItems: activeRecurring
        .filter((r) => !confirmedSet.has(r.description.toLowerCase().trim()))
        .map((r) => ({
          description: r.description,
          amount: this.dec(r.amount),
          type: r.type,
          dueDay: r.dueDay,
        })),
      unpaidInvoices: unpaidInvoices.map((inv) => ({
        id: inv.id,
        referenceMonth: inv.referenceMonth,
        referenceYear: inv.referenceYear,
        remaining: this.dec(inv.totalAmount) - this.dec(inv.paidAmount),
        dueDate: inv.dueDate,
      })),
    };
  }
}