
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Transaction } from '../types';
import { StatCard } from '../components/StatCard';
import { useFixedTransactions } from '../hooks/useFixedTransactions';

interface DashboardViewProps {
    transactions: Transaction[];
    isPrivacyEnabled: boolean;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const DashboardView: React.FC<DashboardViewProps> = ({ transactions, isPrivacyEnabled }) => {

    const totals = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const current = { income: 0, expense: 0 };
        const previous = { income: 0, expense: 0 };
        const overall = { income: 0, expense: 0 };
        const balanceTotal = { value: 0 }; // Balance strictly up to today

        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        transactions.forEach(t => {
            const amount = Number(t.amount);

            // Fix: Parse date as "Calendar Date" (YYYY-MM-DD) to avoid Timezone shifts (e.g. Day 1 -> Day 30/31)
            const datePart = new Date(t.date).toISOString().split('T')[0];
            const [y, m, d] = datePart.split('-').map(Number);
            const date = new Date(y, m - 1, d); // Local Midnight

            const tDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            const tMonth = date.getMonth();
            const tYear = date.getFullYear();

            // Overall totals (Raw Sum - kept for reference if needed, but not for Balance)
            if (t.type === 'INCOME') overall.income += amount;
            else overall.expense += amount;

            // Balance Calculation (Strictly <= Today)
            if (tDateOnly <= todayStart) {
                if (t.type === 'INCOME') balanceTotal.value += amount;
                else balanceTotal.value -= amount;
            }

            // Current Month
            if (tMonth === currentMonth && tYear === currentYear) {
                if (t.type === 'INCOME') current.income += amount;
                else current.expense += amount;
            }

            // Previous Month
            if (tMonth === previousMonth && tYear === previousYear) {
                if (t.type === 'INCOME') previous.income += amount;
                else previous.expense += amount;
            }
        });

        const calculateVariation = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return ((curr - prev) / prev) * 100;
        };

        return {
            income: overall.income,
            expense: overall.expense,
            balance: balanceTotal.value, // Now returns correct "Current Balance"
            currentIncome: current.income,
            currentExpense: current.expense,
            incomeTrend: calculateVariation(current.income, previous.income),
            expenseTrend: calculateVariation(current.expense, previous.expense)
        };
    }, [transactions]);

    const rule503020 = useMemo(() => {
        const needsCategories = ['Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Educação', 'Contas e Serviços'];
        const wantsCategories = ['Lazer', 'Outros', 'Compras', 'Restaurantes', 'Assinaturas', 'Viagem', 'Cuidados Pessoais', 'Presentes'];
        const savingsCategories = ['Investimentos (Aporte)', 'Dívidas/Financiamentos'];

        let needs = 0;
        let wants = 0;
        let savings = 0;

        transactions.forEach(t => {
            if (t.type === 'EXPENSE') {
                const amount = Number(t.amount);
                if (needsCategories.includes(t.category)) {
                    needs += amount;
                } else if (wantsCategories.includes(t.category)) {
                    wants += amount;
                } else if (savingsCategories.includes(t.category)) {
                    savings += amount;
                } else {
                    wants += amount;
                }
            }
        });

        const totalIncome = totals.income || 1;

        return {
            needs: { value: needs, percent: (needs / totalIncome) * 100, target: 50 },
            wants: { value: wants, percent: (wants / totalIncome) * 100, target: 30 },
            savings: { value: savings, percent: (savings / totalIncome) * 100, target: 20 }
        };
    }, [transactions, totals.income]);

    const forecast = useFixedTransactions(transactions, totals);

    const categorySummary = useMemo(() => {
        const categories: Record<string, number> = {};
        transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
            categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
        });
        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions]);

    const monthlyChartData = useMemo(() => {
        const groupedByMonth: Record<string, { income: number; expenses: number }> = {};

        transactions.forEach(t => {
            const monthKey = t.date.toString().substring(0, 7);

            if (!groupedByMonth[monthKey]) {
                groupedByMonth[monthKey] = { income: 0, expenses: 0 };
            }

            if (t.type === 'INCOME') {
                groupedByMonth[monthKey].income += Number(t.amount);
            } else {
                groupedByMonth[monthKey].expenses += Number(t.amount);
            }
        });

        const sortedDirectKeys = Object.keys(groupedByMonth).sort();

        if (sortedDirectKeys.length === 0) return [];

        return sortedDirectKeys.map(key => {
            const [year, month] = key.split('-');
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
            const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' });
            const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

            return {
                month: formattedMonth,
                income: groupedByMonth[key].income,
                expenses: groupedByMonth[key].expenses
            };
        });
    }, [transactions]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Saldo Projetado" value={`R$ ${forecast.projectedBalance.toLocaleString('pt-BR')}`} color="bg-indigo-600 text-indigo-50" icon={<i data-lucide="crosshair" className="text-white"></i>} isVisible={!isPrivacyEnabled} />
                <StatCard title="Saldo Atual" value={`R$ ${totals.balance.toLocaleString('pt-BR')}`} color="bg-indigo-50 text-indigo-600" icon={<i data-lucide="banknote"></i>} isVisible={!isPrivacyEnabled} />
                <StatCard
                    title="Entradas (Mês)"
                    value={`R$ ${totals.currentIncome.toLocaleString('pt-BR')}`}
                    color="bg-emerald-50 text-emerald-600"
                    icon={<i data-lucide="trending-up"></i>}
                    trend={`${Math.abs(totals.incomeTrend).toFixed(1)}%`}
                    trendUp={totals.incomeTrend >= 0}
                    isVisible={!isPrivacyEnabled}
                />
                <StatCard
                    title="Saídas (Mês)"
                    value={`R$ ${totals.currentExpense.toLocaleString('pt-BR')}`}
                    color="bg-rose-50 text-rose-600"
                    icon={<i data-lucide="trending-down"></i>}
                    trend={`${Math.abs(totals.expenseTrend).toFixed(1)}%`}
                    trendUp={totals.expenseTrend <= 0}
                    isVisible={!isPrivacyEnabled}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                <div className="lg:col-span-8 space-y-6 md:space-y-8">
                    <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="mb-8">
                            <h3 className="text-lg font-bold text-slate-800">Performance Mensal</h3>
                            <p className="text-sm text-slate-500">Fluxo consolidado de caixa</p>
                        </div>
                        <div className="h-[250px] md:h-[320px] w-full min-h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyChartData} barSize={20}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dx={-5} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                                        formatter={(value: number) => isPrivacyEnabled ? '••••' : `R$ ${value.toLocaleString('pt-BR')}`}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" />
                                    <Bar name="Receitas" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar name="Despesas" dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            {forecast.missingFixed.length > 0 ? (
                                <>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Fixos Pendentes</h3>
                                    <div className="space-y-3">
                                        {forecast.missingFixed.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <span className="text-xs font-bold text-slate-700">{item.description}</span>
                                                <span className={`text-xs font-black ${isPrivacyEnabled ? 'blur-sm select-none' : (item.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500')}`}>
                                                    {isPrivacyEnabled ? 'R$ •••' : `${item.type === 'INCOME' ? '+' : '-'} R$ ${item.amount.toLocaleString('pt-BR')}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                    <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                                        <i data-lucide="check-circle" className="w-6 h-6"></i>
                                    </div>
                                    <p className="text-sm font-bold text-slate-600">Tudo em dia!</p>
                                    <p className="text-[10px] text-slate-400">Nenhuma conta fixa pendente.</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-6">
                            {/* Top Vilões */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Top Gastos</h3>
                                    <i data-lucide="trophy" className="w-4 h-4 text-amber-500"></i>
                                </div>
                                <div className="space-y-4 relative z-10">
                                    {forecast.topVillains.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-xs font-black w-5 h-5 flex items-center justify-center rounded-full ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {idx + 1}
                                                </span>
                                                <span className={`text-sm font-bold ${isPrivacyEnabled ? 'blur-sm' : 'text-slate-700'}`}>{item.name}</span>
                                            </div>
                                            <span className={`text-sm font-black text-slate-800 ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                                {isPrivacyEnabled ? 'R$ •••' : `R$ ${item.value.toLocaleString('pt-BR')}`}
                                            </span>
                                        </div>
                                    ))}
                                    {forecast.topVillains.length === 0 && <p className="text-xs text-slate-400">Sem dados suficientes.</p>}
                                </div>
                            </div>

                            {/* Fixed Commitment */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Comprometimento</h3>
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${forecast.fixedRatio > 60 ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                        {forecast.fixedRatio.toFixed(0)}%
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium mb-4">Da sua renda mensal já está comprometida com fixos.</p>

                                <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-slate-800"
                                        style={{ width: `${forecast.fixedRatio}%` }}
                                        title="Custos Fixos"
                                    ></div>
                                    <div className="h-full bg-emerald-400 flex-1" title="Livre"></div>
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                    <span className={isPrivacyEnabled ? 'blur-sm select-none' : ''}>
                                        {isPrivacyEnabled ? 'Fixo: R$ •••' : `Fixo: R$ ${forecast.totalFixedExpense.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                                    </span>
                                    <span>Livre</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                <div className="lg:col-span-4 space-y-6 md:space-y-8">
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Regra 50/30/20</h3>
                                <p className="text-sm text-slate-500">Saúde Financeira</p>
                            </div>
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <i data-lucide="pie-chart" className="w-5 h-5 text-indigo-600"></i>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Needs */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-slate-600">Necessidades (50%)</span>
                                    <span className="font-black text-slate-800">{rule503020.needs.percent.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${rule503020.needs.percent > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.min(rule503020.needs.percent, 100)}%` }}
                                    ></div>
                                </div>
                                <p className={`text-xs text-slate-400 font-medium ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                    {isPrivacyEnabled ? 'R$ ••• gastos' : `R$ ${rule503020.needs.value.toLocaleString('pt-BR')} gastos`}
                                </p>
                            </div>

                            {/* Wants */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-slate-600">Desejos (30%)</span>
                                    <span className="font-black text-slate-800">{rule503020.wants.percent.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${rule503020.wants.percent > 30 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${Math.min(rule503020.wants.percent, 100)}%` }}
                                    ></div>
                                </div>
                                <p className={`text-xs text-slate-400 font-medium ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                    {isPrivacyEnabled ? 'R$ ••• gastos' : `R$ ${rule503020.wants.value.toLocaleString('pt-BR')} gastos`}
                                </p>
                            </div>

                            {/* Savings */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="font-bold text-slate-600">Objetivos (20%)</span>
                                    <span className="font-black text-slate-800">{rule503020.savings.percent.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-blue-500"
                                        style={{ width: `${Math.min(rule503020.savings.percent, 100)}%` }}
                                    ></div>
                                </div>
                                <p className={`text-xs text-slate-400 font-medium ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                    {isPrivacyEnabled ? 'R$ ••• reservados' : `R$ ${rule503020.savings.value.toLocaleString('pt-BR')} reservados`}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Alocação de Recursos</h3>
                        <div className="h-64 relative mx-auto">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categorySummary} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                                        {categorySummary.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => isPrivacyEnabled ? '••••' : `R$ ${value.toLocaleString('pt-BR')}`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">Despesas</span>
                                <span className="text-lg font-black text-slate-800">100%</span>
                            </div>
                        </div>
                        <div className="mt-8 space-y-4">
                            {categorySummary.slice(0, 5).map((item, idx) => (
                                <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                        <span className="text-sm font-bold text-slate-600 truncate max-w-[120px]">{item.name}</span>
                                    </div>
                                    <span className={`text-sm font-black text-slate-800 ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                        {isPrivacyEnabled ? 'R$ •••' : `R$ ${item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
