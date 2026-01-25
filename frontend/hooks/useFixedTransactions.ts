import { useMemo } from 'react';
import { Transaction } from '../types';

export const useFixedTransactions = (transactions: Transaction[], totals: { balance: number, income: number }) => {
    return useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // 1. Identify all UNIQUE fixed transactions from history
        const fixedDefinitions: Record<string, {
            amount: number,
            type: 'INCOME' | 'EXPENSE',
            day: number,
            lastSeen: string,
            lastTransactionId: string, // Added to allow editing
            category: string
        }> = {};

        // Sort by date desc to process latest first
        const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        sorted.filter(t => t.isFixed).forEach(t => {
            const key = t.description.toLowerCase().trim();

            // If we haven't seen this description yet (since we sort desc, this is the latest)
            if (!fixedDefinitions[key]) {
                const d = new Date(t.date);
                fixedDefinitions[key] = {
                    amount: Number(t.amount),
                    type: t.type,
                    day: d.getDate(),
                    lastSeen: `${d.getFullYear()}-${d.getMonth()}`,
                    lastTransactionId: t.id,
                    category: t.category
                };
            }
        });

        // 2. Check which ones are MISSING in the current month
        const missingFixed: { description: string, amount: number, type: 'INCOME' | 'EXPENSE', day: number, category: string }[] = [];

        Object.entries(fixedDefinitions).forEach(([desc, def]) => {
            const existsInCurrent = transactions.some(t => {
                const d = new Date(t.date);
                return d.getMonth() === currentMonth &&
                    d.getFullYear() === currentYear &&
                    t.description.toLowerCase().trim() === desc &&
                    t.isFixed; // Ensure strictly looking for fixed version
            });

            if (!existsInCurrent) {
                missingFixed.push({
                    description: desc.charAt(0).toUpperCase() + desc.slice(1),
                    amount: def.amount,
                    type: def.type,
                    day: def.day,
                    category: def.category
                });
            }
        });

        // 3. Calculate Projected Balance
        let projectedBalance = totals.balance;
        missingFixed.forEach(item => {
            if (item.type === 'INCOME') projectedBalance += item.amount;
            else projectedBalance -= item.amount;
        });

        // 4. Fixed Income Commitment
        let totalFixedExpense = 0;
        transactions.forEach(t => {
            const d = new Date(t.date);
            if (t.isFixed && t.type === 'EXPENSE' && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                totalFixedExpense += Number(t.amount);
            }
        });
        missingFixed.filter(t => t.type === 'EXPENSE').forEach(t => totalFixedExpense += t.amount);

        const income = totals.income || 1;
        const fixedRatio = (totalFixedExpense / income) * 100;

        // 5. "Top Villains" (Most expensive descriptions)
        const expensesByDesc: Record<string, number> = {};
        transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
            const key = t.description.trim();
            const normKey = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
            expensesByDesc[normKey] = (expensesByDesc[normKey] || 0) + Number(t.amount);
        });

        const topVillains = Object.entries(expensesByDesc)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);

        // Convert fixedDefinitions record to array for the list view
        const fixedItems = Object.entries(fixedDefinitions).map(([key, value]) => ({
            name: key.charAt(0).toUpperCase() + key.slice(1),
            ...value
        })).sort((a, b) => a.day - b.day);

        return {
            projectedBalance,
            missingFixed,
            fixedRatio: Math.min(fixedRatio, 100),
            totalFixedExpense,
            fixedItems,
            topVillains // Restoration
        };
    }, [transactions, totals.balance, totals.income]);
};
