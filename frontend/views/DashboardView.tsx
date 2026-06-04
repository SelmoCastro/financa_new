import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Transaction } from '../types';
import { StatCard } from '../components/StatCard';
import { useFixedTransactions } from '../hooks/useFixedTransactions';

import { Skeleton } from '../components/Skeleton';
import { useMonth } from '../context/MonthContext';
import { useData } from '../context/DataProvider';
import api from '../services/api';
import { Sparkles, RefreshCw, AlertCircle, Crosshair, Banknote, TrendingUp, TrendingDown, CheckCircle, Trophy, PieChart as PieChartIcon } from 'lucide-react';
import { OnboardingWidget } from '../components/OnboardingWidget';
import { ProjectionWidget } from '../components/ProjectionWidget';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { motion } from 'framer-motion';

interface DashboardViewProps {
    transactions: Transaction[];
    isPrivacyEnabled: boolean;
    isLoading?: boolean;
    onAddAccount?: () => void;
    onAddTransaction?: () => void;
    onAddBudget?: () => void;
}

const COLORS = ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#8b5cf6'];

export const DashboardView: React.FC<DashboardViewProps> = ({ transactions, isPrivacyEnabled, isLoading = false, onAddAccount, onAddTransaction, onAddBudget }) => {
    const { formatCurrency } = useCurrency();
    const { t } = useLanguage();
    const { selectedDate } = useMonth();
    const [insights, setInsights] = React.useState<string | null>(null);
    const [isFetchingInsights, setIsFetchingInsights] = React.useState(false);

    const { dashboardSummary, accounts } = useData();

    const totals = useMemo(() => ({
        income: dashboardSummary?.currentMonth?.income || 0,
        expense: dashboardSummary?.currentMonth?.expense || 0,
        balance: dashboardSummary?.balance || 0,
        currentIncome: dashboardSummary?.currentMonth?.income || 0,
        currentExpense: dashboardSummary?.currentMonth?.expense || 0,
        incomeTrend: dashboardSummary?.currentMonth?.incomeTrend || 0,
        expenseTrend: dashboardSummary?.currentMonth?.expenseTrend || 0,
        creditCardDebt: dashboardSummary?.creditCardDebt || 0
    }), [dashboardSummary]);

    const pendingInvoices = useMemo(() => {
        return dashboardSummary?.pendingInvoices || [];
    }, [dashboardSummary]);

    const rule503020 = useMemo(() => {
        if (!dashboardSummary) return {
            needs: { value: 0, percent: 0, target: 50 },
            wants: { value: 0, percent: 0, target: 30 },
            savings: { value: 0, percent: 0, target: 20 },
            uncategorized: { value: 0, percent: 0 }
        };

        return {
            needs: { ...dashboardSummary.rule503020.needs, target: 50 },
            wants: { ...dashboardSummary.rule503020.wants, target: 30 },
            savings: { ...dashboardSummary.rule503020.savings, target: 20 },
            uncategorized: dashboardSummary.rule503020.uncategorized || { value: 0, percent: 0 }
        };
    }, [dashboardSummary]);

    const forecast = useFixedTransactions(transactions, totals, selectedDate);

    const availableReal = useMemo(() => {
        const missingIncome = forecast.missingFixed.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
        const missingExpense = forecast.missingFixed.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
        
        const totalExpectedIncome = totals.currentIncome + missingIncome;
        const totalExpectedExpense = totals.currentExpense + missingExpense;
        
        return totalExpectedIncome - totalExpectedExpense;
    }, [totals.currentIncome, totals.currentExpense, forecast.missingFixed]);

    const categorySummary = useMemo(() => {
        return dashboardSummary?.categorySummary || [];
    }, [dashboardSummary]);

    const monthlyChartData = useMemo(() => {
        return dashboardSummary?.monthlyHistory || [];
    }, [dashboardSummary]);

    const fetchInsights = async () => {
        setIsFetchingInsights(true);
        try {
            const response = await api.get('/ai/insights', {
                params: {
                    year: selectedDate.getFullYear(),
                    month: selectedDate.getMonth()
                }
            });
            setInsights(response.data.insights);
        } catch (error) {
            console.error('Erro ao buscar insights:', error);
            setInsights('Não foi possível carregar os insights no momento.');
        } finally {
            setIsFetchingInsights(false);
        }
    };

    return (
        <div className="space-y-8">
            <OnboardingWidget onAddAccount={onAddAccount} onAddTransaction={onAddTransaction} onAddBudget={onAddBudget} />

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-10">
                {isLoading ? (
                    <>
                        <Skeleton className="h-[120px] rounded-3xl" />
                        <Skeleton className="h-[120px] rounded-3xl" />
                        <Skeleton className="h-[120px] rounded-3xl" />
                        <Skeleton className="h-[120px] rounded-3xl" />
                    </>
                ) : (
                    <>
                        <StatCard 
                            title={t('dashboard.available')} 
                            value={formatCurrency(availableReal)} 
                            color={availableReal < 0 ? "bg-rose-600 text-white" : "bg-cyan-600 text-cyan-50"} 
                            icon={availableReal < 0 ? <AlertCircle className="text-white animate-pulse" /> : <Banknote className="text-white" />} 
                            isVisible={!isPrivacyEnabled} 
                        />
                        <StatCard title={t('dashboard.currentBalance')} value={formatCurrency(totals.balance)} color="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300" icon={<Banknote className="" />} isVisible={!isPrivacyEnabled} />
                        <StatCard
                            title={t('dashboard.cardInvoice')}
                            value={formatCurrency(totals.creditCardDebt)}
                            color={totals.creditCardDebt > 0 ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}
                            icon={totals.creditCardDebt > 0 ? <AlertCircle className="text-amber-500" /> : <CheckCircle className="text-emerald-500" />}
                            isVisible={!isPrivacyEnabled}
                        />
                        <StatCard 
                            title={t('dashboard.monthIncome')} 
                            value={formatCurrency(totals.currentIncome)} 
                            color="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                            icon={<TrendingUp className="" />} 
                            trend={`${Math.abs(totals.incomeTrend).toFixed(1)}%`} 
                            trendUp={totals.incomeTrend >= 0} 
                            isVisible={!isPrivacyEnabled} 
                        />
                        <StatCard title={t('dashboard.monthExpense')} value={formatCurrency(totals.currentExpense)} color="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" icon={<TrendingDown className="" />} trend={`${Math.abs(totals.expenseTrend).toFixed(1)}%`} trendUp={totals.expenseTrend <= 0} isVisible={!isPrivacyEnabled} />
                    </>
                )}
            </div>

            <div className="mb-6">
              <ProjectionWidget isPrivacyEnabled={isPrivacyEnabled} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="lg:col-span-12"
                >
                    <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 text-white shadow-xl shadow-cyan-100 dark:shadow-none flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group animate-float">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>

                        <div className="flex-1 space-y-4 relative z-10">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-black">{t('dashboard.smartInsights')}</h2>
                            </div>

                            {isFetchingInsights ? (
                                <div className="space-y-3">
                                    <div className="h-4 w-3/4 bg-white/20 rounded animate-pulse"></div>
                                    <div className="h-4 w-1/2 bg-white/20 rounded animate-pulse"></div>
                                    <div className="h-4 w-2/3 bg-white/20 rounded animate-pulse"></div>
                                </div>
                            ) : insights ? (
                                <div className="prose prose-invert max-w-none">
                                    <ul className="grid grid-cols-1 md:grid-cols-1 gap-2 list-none p-0 m-0">
                                        {insights.split('\n').filter(line => line.trim()).map((line, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm font-bold leading-relaxed bg-white/5 p-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                                                <div className="w-2 h-2 mt-2 bg-cyan-300 rounded-full flex-shrink-0" />
                                                {line.replace(/^[-\d.]\s*/, '')}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <p className="text-cyan-100 text-sm font-medium">
                                    {t('dashboard.insightsPrompt')}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={fetchInsights}
                            disabled={isFetchingInsights}
                            className={`relative z-10 flex items-center gap-2 bg-white text-cyan-600 px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-cyan-50 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-lg ${!insights && !isFetchingInsights ? 'animate-pulse hover:animate-none' : ''}`}
                        >
                            {isFetchingInsights ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {isFetchingInsights ? t('dashboard.updateTips') : insights ? t('dashboard.updateTips') : t('dashboard.analyzeMonth')}
                        </button>
                    </div>
                </motion.div>

                <div className="lg:col-span-8 space-y-6 md:space-y-8">
                    <div className="glass-card p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] overflow-hidden">
                        <div className="mb-8">
                            <h3 className="text-lg font-black text-slate-800 dark:text-white">{t('dashboard.monthlyPerformance')}</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">{t('dashboard.cashFlow')}</p>
                        </div>
                        <div className="h-[250px] md:h-[320px] w-full min-h-[250px] relative">
                            {isLoading ? (
                                <Skeleton className="w-full h-full rounded-2xl" />
                            ) : monthlyChartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
                                    <BarChart data={monthlyChartData} barSize={20}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-5" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dx={-5} />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc', opacity: 0.1 }}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.95)' }}
                                            itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                                            formatter={(value: number) => isPrivacyEnabled ? '••••' : formatCurrency(value)}
                                        />
                                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }} />
                                        <Bar name={t('dashboard.revenues')} dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                        <Bar name={t('dashboard.expenses')} dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-6 bg-slate-50/50 dark:bg-slate-900/20 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center mb-4">
                                        <Banknote className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                    </div>
                                    {accounts && accounts.length === 0 ? (
                                        <>
                                            <h4 className="text-slate-700 dark:text-slate-200 font-black mb-1">{t('dashboard.welcome')}</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-4 font-medium">{t('dashboard.welcomeDesc')}</p>
                                            <p className="text-[10px] text-rose-500 font-black bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 uppercase tracking-widest">
                                                <Banknote className="w-3 h-3" />
                                                {t('dashboard.addAccount')}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <h4 className="text-slate-700 dark:text-slate-200 font-black mb-1">{t('dashboard.noEntries')}</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-4 font-medium">{t('dashboard.noEntriesDesc')}</p>
                                            <p className="text-[10px] text-cyan-500 font-black bg-cyan-50 dark:bg-cyan-500/10 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 uppercase tracking-widest">
                                                <Sparkles className="w-3 h-3" />
                                                {t('dashboard.startEntry')}
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2.5rem]">
                            {isLoading ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-full" />
                                </div>
                            ) : forecast.missingFixed.length > 0 ? (
                                <>
                                    <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-4">{t('dashboard.fixedPending')}</h3>
                                    <div className="space-y-3">
                                        {forecast.missingFixed.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors hover:border-cyan-200 dark:hover:border-cyan-900/50 group">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.description}</span>
                                                <span className={`text-sm font-black ${isPrivacyEnabled ? 'blur-sm select-none' : (item.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500')}`}>
                                                    {isPrivacyEnabled ? '••••' : `${item.type === 'INCOME' ? '+' : '-'} ${formatCurrency(item.amount)}`}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-60">
                                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-3">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <p className="text-sm font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">{t('dashboard.allPaid')}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{t('dashboard.noPendingFixed')}</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-6">
                            <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] relative overflow-hidden">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('dashboard.topExpenses')}</h3>
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                </div>
                                <div className="space-y-4 relative z-10">
                                    {forecast.topVillains.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-lg ${idx === 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                                    {idx + 1}
                                                </span>
                                                <span className={`text-sm font-bold ${isPrivacyEnabled ? 'blur-sm' : 'text-slate-700 dark:text-slate-300'}`}>{item.name}</span>
                                            </div>
                                            <span className={`text-sm font-black text-slate-800 dark:text-white ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                                {isPrivacyEnabled ? '••••' : formatCurrency(item.value)}
                                            </span>
                                        </div>
                                    ))}
                                    {forecast.topVillains.length === 0 && <p className="text-xs text-slate-400">{t('dashboard.insufficientData')}</p>}
                                </div>
                            </div>

                            <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2.5rem]">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t('dashboard.compromise')}</h3>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${forecast.fixedRatio > 60 ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20' : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20'}`}>
                                        {forecast.fixedRatio.toFixed(0)}%
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-4 uppercase tracking-tighter">{t('dashboard.fixedRatioDesc')}</p>

                                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-slate-800 dark:bg-cyan-500"
                                        style={{ width: `${forecast.fixedRatio}%` }}
                                        title={t('dashboard.fixedCost')}
                                    ></div>
                                    <div className="h-full bg-emerald-400/40 flex-1" title={t('dashboard.free')}></div>
                                </div>
                                <div className="flex justify-between mt-3 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    <span className={isPrivacyEnabled ? 'blur-sm select-none' : ''}>
                                        {isPrivacyEnabled ? t('dashboard.fixedLabel', { value: '••••' }) : t('dashboard.fixedLabel', { value: formatCurrency(forecast.totalFixedExpense, { maximumFractionDigits: 0 }) })}
                                    </span>
                                    <span>{t('dashboard.free')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6 md:space-y-8">
                    <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2.5rem]">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 dark:text-white">{t('dashboard.ruleTitle')}</h3>
                                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">{t('dashboard.financialHealth')}</p>
                            </div>
                            <div className="p-2 bg-cyan-50 dark:bg-cyan-500/10 rounded-xl">
                                <PieChartIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2 group cursor-help" title={t('dashboard.needsTooltip')}>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        {t('dashboard.needs')}
                                        <AlertCircle className={`w-3.5 h-3.5 transition-colors ${rule503020.needs.percent > 50 ? 'text-rose-500' : 'text-slate-300 dark:text-slate-600'}`} />
                                    </span>
                                    <span className={`font-black ${rule503020.needs.percent > 50 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{rule503020.needs.percent.toFixed(1)}%</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${rule503020.needs.percent > 55 ? 'bg-rose-600 animate-pulse' : rule503020.needs.percent > 50 ? 'bg-rose-500' : 'bg-cyan-500'}`}
                                        style={{ width: `${Math.max(Math.min(rule503020.needs.percent || 0, 100), rule503020.needs.value > 0 ? 2 : 0)}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">{t('dashboard.suggestion', { value: formatCurrency(totals.currentIncome * 0.5) })}</p>
                            </div>

                            <div className="space-y-2 group cursor-help" title={t('dashboard.wantsTooltip')}>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        {t('dashboard.wants')}
                                        <AlertCircle className={`w-3.5 h-3.5 transition-colors ${rule503020.wants.percent > 30 ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} />
                                    </span>
                                    <span className={`font-black ${rule503020.wants.percent > 30 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>{rule503020.wants.percent.toFixed(1)}%</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${rule503020.wants.percent > 35 ? 'bg-amber-600 animate-pulse' : rule503020.wants.percent > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                        style={{ width: `${Math.max(Math.min(rule503020.wants.percent || 0, 100), rule503020.wants.value > 0 ? 2 : 0)}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">{t('dashboard.suggestion', { value: formatCurrency(totals.currentIncome * 0.3) })}</p>
                            </div>

                            <div className="space-y-2 group cursor-help" title={t('dashboard.savingsTooltip')}>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        {t('dashboard.savings')}
                                        <AlertCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                                    </span>
                                    <span className="font-black text-slate-900 dark:text-white">{rule503020.savings.percent.toFixed(1)}%</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                    <div
                                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.max(Math.min(rule503020.savings.percent || 0, 100), rule503020.savings.value > 0 ? 2 : 0)}%` }}
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">{t('dashboard.suggestion', { value: formatCurrency(totals.currentIncome * 0.2) })}</p>
                            </div>

                            {rule503020.uncategorized && rule503020.uncategorized.value > 0 && (
                                <div className="space-y-2 group cursor-help" title={t('dashboard.uncategorizedTooltip')}>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            {t('dashboard.other')}
                                            <AlertCircle className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                                        </span>
                                        <span className="font-black text-slate-900 dark:text-white">{rule503020.uncategorized.percent.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                                        <div
                                            className="h-full bg-slate-400 dark:bg-slate-500 rounded-full transition-all duration-500"
                                            style={{ width: `${Math.max(Math.min(rule503020.uncategorized.percent || 0, 100), rule503020.uncategorized.value > 0 ? 2 : 0)}%` }}
                                        />
                                    </div>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">{t('dashboard.uncategorized')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2.5rem]">
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6">{t('dashboard.resourceAllocation')}</h3>
                        <div className="h-64 relative mx-auto">
                            {categorySummary.length > 0 ? (
                            <>
                            <ResponsiveContainer width="100%" height="100%" minWidth={150} minHeight={150}>
                                <PieChart>
                                    <Pie data={categorySummary} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" isAnimationActive={false}>
                                        {categorySummary.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />)}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.95)' }}
                                        itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                                        formatter={(value: number) => isPrivacyEnabled ? '••••' : formatCurrency(value)} 
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{t('dashboard.expenses')}</span>
                                <span className="text-xl font-black text-slate-800 dark:text-white">100%</span>
                            </div>
                            </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <p className="text-sm text-slate-400 dark:text-slate-500">{t('dashboard.noCategoryData')}</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-8 space-y-3">
                            {categorySummary.slice(0, 5).map((item, idx) => (
                                <div key={item.name} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{item.name}</span>
                                    </div>
                                    <span className={`text-sm font-black text-slate-800 dark:text-slate-200 ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                        {isPrivacyEnabled ? '••••' : formatCurrency(item.value, { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {pendingInvoices.length > 0 && (
                        <div className="glass-card p-4 md:p-6 rounded-2xl md:rounded-[2.5rem]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">{t('dashboard.pendingInvoices')}</h3>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-[10px]">{t('dashboard.creditCard')}</p>
                                </div>
                                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-amber-500" />
                                </div>
                            </div>
                            <div className="space-y-3">
                                {pendingInvoices.map((inv) => (
                                    <div key={inv.id} className="p-4 bg-amber-50/50 dark:bg-amber-500/5 rounded-2xl border border-amber-100 dark:border-amber-500/10">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{inv.creditCardName}</span>
                                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${inv.remaining > 0 ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20'}`}>
                                                {String(inv.referenceMonth).padStart(2, '0')}/{inv.referenceYear}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <span className={`text-lg font-black ${isPrivacyEnabled ? 'blur-sm' : 'text-slate-800 dark:text-white'}`}>
                                                    {isPrivacyEnabled ? '••••' : formatCurrency(inv.remaining)}
                                                </span>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                                                    {t('dashboard.due', { date: new Date(inv.dueDate).toLocaleDateString('pt-BR') })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">
                                                    {t('dashboard.total', { value: isPrivacyEnabled ? '••••' : formatCurrency(inv.totalAmount) })}
                                                </p>
                                                {inv.paidAmount > 0 && (
                                                    <p className="text-[11px] text-emerald-500 font-bold">
                                                        {t('dashboard.paid', { value: isPrivacyEnabled ? '••••' : formatCurrency(inv.paidAmount) })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
