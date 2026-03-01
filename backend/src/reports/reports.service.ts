import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    async getDashboardSummary(userId: string, year?: number, month?: number) {
        const now = new Date();
        const targetYear = year !== undefined ? year : now.getFullYear();
        const targetMonth = month !== undefined ? month : now.getMonth(); // 0-indexed month

        const startOfMonth = new Date(targetYear, targetMonth, 1);
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

        // 1. Calculate General Balance (All time)
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
        const targetStart = new Date(y, m, 1);
        const targetEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);
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

        return {
            userSummary: monthSummary,
            activeGoals: goals,
            activeBudgets: budgets,
            topMonthlyExpenses: formattedTopExpenses
        };
    }
}
