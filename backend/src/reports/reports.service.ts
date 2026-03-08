import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardSummary(userId: string, year?: number, month?: number) {
        const now = new Date();
        const targetYear = year !== undefined ? year : now.getFullYear();
        const targetMonth = month !== undefined ? month : now.getMonth(); // 0-indexed month

        const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1));
        const endOfMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));

        // Get transfer categories to exclude them
        const transferCategories = await this.prisma.category.findMany({
            where: { userId, type: 'TRANSFER' },
            select: { id: true }
        });
        const transferCatIds = transferCategories.map(c => c.id);

        const filterOutTransfers = {
            categoryId: { notIn: transferCatIds },
            OR: [
                { categoryLegacy: { not: 'Transferência' } },
                { categoryLegacy: null }
            ]
        };

        // 1. Calculate General Balance (All time)
        const balanceGroup = await this.prisma.transaction.groupBy({
            by: ['type'],
            where: {
                userId,
                ...filterOutTransfers
            },
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
                ...filterOutTransfers,
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

        // 2.5 Calculate Previous Month for Trends
        const prevMonth = targetMonth === 0 ? 11 : targetMonth - 1;
        const prevYear = targetMonth === 0 ? targetYear - 1 : targetYear;
        const startOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth, 1));
        const endOfPrevMonth = new Date(Date.UTC(prevYear, prevMonth + 1, 0, 23, 59, 59, 999));

        const prevMonthGroup = await this.prisma.transaction.groupBy({
            by: ['type'],
            where: {
                userId,
                ...filterOutTransfers,
                date: {
                    gte: startOfPrevMonth,
                    lte: endOfPrevMonth
                }
            },
            _sum: { amount: true },
        });

        let prevIncome = 0;
        let prevExpense = 0;

        prevMonthGroup.forEach(g => {
            if (g.type === 'INCOME') prevIncome += Number(g._sum.amount || 0);
            else if (g.type === 'EXPENSE') prevExpense += Number(g._sum.amount || 0);
        });

        const incomeTrend = prevIncome === 0 && currentIncome > 0 ? 100 : prevIncome === 0 ? 0 : ((currentIncome - prevIncome) / prevIncome) * 100;
        const expenseTrend = prevExpense === 0 && currentExpense > 0 ? 100 : prevExpense === 0 ? 0 : ((currentExpense - prevExpense) / prevExpense) * 100;

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

        const needsCategories = ['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais'];
        const wantsCategories = ['Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Viagens'];
        const savingsCategories = ['Aplicações / Poupança', 'Pagamento de Dívidas'];

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

        // 3. Rule 50/30/20 (Expenses only, current month)
        // Note: We use strictly currentIncome as base to show real financial health/excess.
        // If income is 0, we use 1 to avoid division by zero errors while showing 0% savings.
        const incomeBase = currentIncome > 0 ? currentIncome : 1;

        // 4. Category Summary (Pie Chart Data)
        const categorySummary: { name: string, value: number }[] = [];
        categoryGroup.forEach(g => {
            const catName = (g.categoryId ? categoryMap.get(g.categoryId) : g.categoryLegacy) || 'Outros';
            const val = g._sum.amount ? Number(g._sum.amount) : 0;

            if (val > 0) {
                const existing = categorySummary.find(c => c.name === catName);
                if (existing) {
                    existing.value += val;
                } else {
                    categorySummary.push({ name: catName, value: val });
                }
            }
        });
        categorySummary.sort((a, b) => b.value - a.value);

        // 5. Monthly History (Bar Chart Data)
        const allTxs = await this.prisma.transaction.findMany({
            where: {
                userId,
                ...filterOutTransfers,
            },
            select: { date: true, amount: true, type: true },
            orderBy: { date: 'asc' }
        });

        const monthlyMap = new Map<string, { income: number; expenses: number; month: string }>();
        allTxs.forEach(t => {
            const d = new Date(t.date);
            const monthKey = `${d.getFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; // Avoid timezone drift
            if (!monthlyMap.has(monthKey)) {
                // Use UTC month name extraction to be robust
                const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });
                const monthName = formatter.format(d);
                const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
                monthlyMap.set(monthKey, { income: 0, expenses: 0, month: formattedMonth });
            }
            const stats = monthlyMap.get(monthKey);
            if (t.type === 'INCOME') stats!.income += Number(t.amount);
            else if (t.type === 'EXPENSE') stats!.expenses += Number(t.amount);
        });
        const monthlyHistory = Array.from(monthlyMap.values());

        return {
            balance,
            currentMonth: {
                income: currentIncome,
                expense: currentExpense,
                incomeTrend,
                expenseTrend
            },
            rule503020: {
                needs: { value: needs, percent: (needs / incomeBase) * 100 },
                wants: { value: wants, percent: (wants / incomeBase) * 100 },
                savings: { value: savings, percent: (savings / incomeBase) * 100 }
            },
            categorySummary,
            monthlyHistory
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

        // 1. Resumo do mês atual ou selecionado
        const monthSummary = await this.getDashboardSummary(userId, y, m);

        // 2. Metas do usuário
        const goals = await this.prisma.goal.findMany({
            where: { userId },
            select: { title: true, targetAmount: true, currentAmount: true, deadline: true }
        });

        // 3. Orçamentos vs Realizado
        const budgets = await this.prisma.budget.findMany({
            where: { userId },
            select: { category: true, amount: true }
        });

        // 4. Maiores categorias de gasto no mês
        const targetStart = new Date(Date.UTC(y, m, 1));
        const targetEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
        const topExpenses = await this.prisma.transaction.groupBy({
            by: ['categoryId', 'categoryLegacy'],
            where: {
                userId,
                type: 'EXPENSE',
                date: {
                    gte: targetStart,
                    lte: targetEnd
                }
            },
            _sum: { amount: true },
            orderBy: { _sum: { amount: 'desc' } },
            take: 5
        });

        const categories = await this.prisma.category.findMany({ where: { userId } });
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));

        const formattedTopExpenses = topExpenses.map(g => ({
            category: (g.categoryId ? categoryMap.get(g.categoryId) : g.categoryLegacy) || 'Outros',
            amount: g._sum.amount || 0
        }));

        // 5. Últimas 50 transações para contexto específico da IA
        const recentTransactions = await this.prisma.transaction.findMany({
            where: { userId },
            select: {
                description: true,
                amount: true,
                date: true,
                type: true
            },
            orderBy: { date: 'desc' },
            take: 50
        });

        return {
            userSummary: monthSummary,
            activeGoals: goals,
            activeBudgets: budgets,
            topMonthlyExpenses: formattedTopExpenses,
            recentTransactions
        };
    }

    /**
     * Retorna um resumo histórico dos últimos 3 meses focado apenas nas despesas.
     * Ideal para contexto de Forecasting na Inteligência Artificial.
     */
    async getHistoricalSpending(userId: string) {
        const now = new Date();
        const startOfHistory = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 3, 1));
        const endOfHistory = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));

        const transactions = await this.prisma.transaction.findMany({
            where: {
                userId,
                type: 'EXPENSE',
                date: {
                    gte: startOfHistory,
                    lte: endOfHistory
                }
            },
            select: {
                amount: true,
                date: true,
                categoryId: true,
                categoryLegacy: true
            }
        });

        const categories = await this.prisma.category.findMany({ where: { userId } });
        const categoryMap = new Map(categories.map(c => [c.id, c.name]));

        return transactions.map(t => ({
            amount: t.amount,
            date: t.date,
            category: (t.categoryId ? categoryMap.get(t.categoryId) : t.categoryLegacy) || 'Outros'
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
                date: {
                    gte: ninetyDaysAgo,
                    lte: now
                }
            },
            select: {
                description: true,
                amount: true,
                date: true
            },
            orderBy: {
                date: 'desc'
            },
            take: 100
        });
    }
}
