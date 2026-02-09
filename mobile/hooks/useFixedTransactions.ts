import { useMemo } from 'react';
import { Transaction } from '../types';
import { getStartOfDay, getYearMonth, parseDate } from '../utils/dateUtils';

export const useFixedTransactions = (transactions: Transaction[], totals: { balance: number, income: number, currentIncome?: number }) => {
    return useMemo(() => {
        const now = new Date();
        const { year: currentYear, month: currentMonth } = getYearMonth(now);
        const todayStart = getStartOfDay(now);

        // Indices and accumulators
        const fixedDefinitions: Record<string, {
            amount: number,
            type: 'INCOME' | 'EXPENSE',
            day: number,
            lastSeen: string,
            lastTransactionId: string,
            category: string
        }> = {};

        const expensesByDesc: Record<string, number> = {};
        let totalFixedExpense = 0;
        let projectedBalance = totals.balance;

        // Helper to normalize description key
        const getFixedKey = (desc: string) => desc.toLowerCase().trim();
        const getVillainKey = (desc: string) => {
            const key = desc.trim();
            return key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
        };

        // Single pass for some logic would be ideal, but strict separation is okay if efficient.
        // We need to iterate chronologically desc for fixed definitions (latest first).
        const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // 1. Identify Fixed Definitions & Calculate Projected/Villains in one go where possible?
        // Actually, logic differs. 
        // Fixed Defs: needs latest occurrence.
        // Villains/Projected: needs current month or future.

        // We can optimize by parsing dates once.
        const parsedTransactions = sorted.map(t => ({
            ...t,
            parsedDate: parseDate(t.date),
            amountNum: Number(t.amount)
        }));

        // 1. Build Fixed Definitions
        parsedTransactions.forEach(t => {
            if (t.isFixed) {
                const key = getFixedKey(t.description);
                if (!fixedDefinitions[key]) {
                    const d = t.parsedDate;
                    fixedDefinitions[key] = {
                        amount: t.amountNum,
                        type: t.type,
                        day: d.getDate(),
                        lastSeen: `${d.getFullYear()}-${d.getMonth()}`,
                        lastTransactionId: t.id,
                        category: t.category
                    };
                }
            }
        });

        // 2. Process Current Month Data + Future 
        parsedTransactions.forEach(t => {
            const tDate = t.parsedDate;
            const tYear = tDate.getFullYear();
            const tMonth = tDate.getMonth();
            const isCurrentMonth = tYear === currentYear && tMonth === currentMonth;

            // Projected Balance Logic
            // Future transactions in current month
            if (isCurrentMonth) {
                const tDateOnly = getStartOfDay(tDate);
                if (tDateOnly > todayStart) {
                    if (t.type === 'INCOME') projectedBalance += t.amountNum;
                    else projectedBalance -= t.amountNum;
                }

                // Top Villains Logic (Expenses in current month)
                if (t.type === 'EXPENSE') {
                    const key = getVillainKey(t.description);
                    expensesByDesc[key] = (expensesByDesc[key] || 0) + t.amountNum;

                    // Fixed Expense Logic (Already paid in current month)
                    if (t.isFixed) {
                        totalFixedExpense += t.amountNum;
                    }
                }
            }
        });

        // 3. Find Missing Fixed Transactions
        const missingFixed: { description: string, amount: number, type: 'INCOME' | 'EXPENSE', day: number, category: string }[] = [];

        Object.entries(fixedDefinitions).forEach(([key, def]) => {
            // Check if this fixed def exists in current month transactions
            const existsInCurrent = parsedTransactions.some(t => {
                const d = t.parsedDate;
                return d.getFullYear() === currentYear &&
                    d.getMonth() === currentMonth &&
                    t.isFixed &&
                    getFixedKey(t.description) === key;
            });

            if (!existsInCurrent) {
                const missingItem = {
                    description: key.charAt(0).toUpperCase() + key.slice(1),
                    amount: def.amount,
                    type: def.type,
                    day: def.day,
                    category: def.category
                };
                missingFixed.push(missingItem);

                // Update Projected Balance with missing fixed
                if (def.type === 'INCOME') projectedBalance += def.amount;
                else projectedBalance -= def.amount;

                // Update Fixed Expense Total if missing
                if (def.type === 'EXPENSE') totalFixedExpense += def.amount;
            }
        });

        const income = totals.currentIncome || totals.income || 1;
        const fixedRatio = (totalFixedExpense / income) * 100;

        const topVillains = Object.entries(expensesByDesc)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3);

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
            topVillains
        };
    }, [transactions, totals.balance, totals.income, totals.currentIncome]);
};
