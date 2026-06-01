import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import api from '../../services/api';
import { useMonth } from '../../context/MonthContext';
import { useCurrency } from '../../context/CurrencyContext';
import { useTransactions } from '../../hooks/useTransactions';
import { MonthSelector } from '../../components/MonthSelector';
import { Skeleton } from '../../components/Skeleton';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#8b5cf6', '#ec4899'];

interface DashboardSummary {
    balance: number;
    currentMonth: {
        income: number;
        expense: number;
        incomeTrend: number;
        expenseTrend: number;
    };
    rule503020: {
        needs: { value: number; percent: number };
        wants: { value: number; percent: number };
        savings: { value: number; percent: number };
    };
    categorySummary: { name: string; value: number }[];
    monthlyHistory: { month: string; income: number; expenses: number }[];
}

export default function ReportsScreen() {
    const insets = useSafeAreaInsets();
    const { selectedDate } = useMonth();
    const { formatCurrency } = useCurrency();
    const { isPrivacyEnabled, togglePrivacy } = useTransactions();

    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [periodFilter, setPeriodFilter] = useState<'month' | '3m' | '6m' | '12m'>('month');

    const fetchSummary = useCallback(async () => {
        try {
            setLoading(true);
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const res = await api.get(`/transactions/dashboard-summary?year=${year}&month=${month}`);
            setSummary(res.data);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchSummary();
    };

    const formatValue = (value: number | undefined | null) => {
        if (isPrivacyEnabled) return '••••';
        return formatCurrency(value || 0);
    };

    // Filtered monthly history based on period selection
    const filteredMonthlyHistory = useMemo(() => {
        if (!summary?.monthlyHistory) return [];
        switch (periodFilter) {
            case '3m': return summary.monthlyHistory.slice(-3);
            case '6m': return summary.monthlyHistory.slice(-6);
            case '12m': return summary.monthlyHistory;
            default: return summary.monthlyHistory.slice(-4);
        }
    }, [summary?.monthlyHistory, periodFilter]);

    // Category chart data
    const categoryChartData = useMemo(() => {
        if (!summary?.categorySummary) return [];
        return summary.categorySummary.map((item, index) => ({
            value: item.value,
            color: COLORS[index % COLORS.length],
            text: item.name,
        }));
    }, [summary?.categorySummary]);

    const maxBarValue = useMemo(() => {
        if (!filteredMonthlyHistory.length) return 1000;
        return Math.max(...filteredMonthlyHistory.flatMap(d => [d.income, d.expenses]), 1000);
    }, [filteredMonthlyHistory]);

    // Rule 50/30/20 segments
    const ruleSegments = useMemo(() => {
        if (!summary?.rule503020) return [];
        const r = summary.rule503020;
        return [
            { label: 'Necessidades', percent: Math.round(r.needs.percent), value: r.needs.value, color: '#6366f1', ideal: 50 },
            { label: 'Desejos', percent: Math.round(r.wants.percent), value: r.wants.value, color: '#f59e0b', ideal: 30 },
            { label: 'Poupança', percent: Math.round(r.savings.percent), value: r.savings.value, color: '#10b981', ideal: 20 },
        ];
    }, [summary?.rule503020]);

    if (loading) {
        return (
            <View className="flex-1 bg-slate-50 dark:bg-slate-950" style={{ paddingTop: insets.top + 20 }}>
                <View className="px-6 mb-4">
                    <Skeleton width={150} height={28} />
                    <Skeleton width={200} height={16} style={{ marginTop: 8 }} />
                </View>
                {[1, 2, 3].map(i => (
                    <View key={i} className="mx-6 mb-4 bg-white dark:bg-slate-900 rounded-3xl p-6">
                        <Skeleton width="80%" height={20} />
                        <Skeleton width="60%" height={16} style={{ marginTop: 8, marginBottom: 20 }} />
                        <Skeleton width="100%" height={120} />
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View className="flex-1 bg-slate-50 dark:bg-slate-950" style={{ position: 'relative' }}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            >
                {/* Header */}
                <View style={{ paddingTop: Math.max(insets.top + 20, 50) }} className="px-6 mb-2">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-2xl font-black text-slate-900 dark:text-white">Relatórios</Text>
                            <Text className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Análise Financeira</Text>
                        </View>
                        <Pressable
                            onPress={togglePrivacy}
                            hitSlop={15}
                            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
                        >
                            <MaterialIcons name={isPrivacyEnabled ? "visibility-off" : "visibility"} size={20} color="#64748b" />
                        </Pressable>
                    </View>
                    <View className="mt-4">
                        <MonthSelector />
                    </View>
                </View>

                {/* Summary Cards */}
                {summary && (
                    <View className="px-6 mb-2">
                        <View className="flex-row gap-3">
                            <View className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                <View className="flex-row items-center gap-2 mb-1">
                                    <MaterialIcons name="trending-up" size={16} color="#10b981" />
                                    <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Receitas</Text>
                                </View>
                                <Text className="text-lg font-black text-emerald-600" style={isPrivacyEnabled && { color: '#cbd5e1' }}>
                                    {formatValue(summary.currentMonth.income)}
                                </Text>
                            </View>
                            <View className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                <View className="flex-row items-center gap-2 mb-1">
                                    <MaterialIcons name="trending-down" size={16} color="#f43f5e" />
                                    <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Despesas</Text>
                                </View>
                                <Text className="text-lg font-black text-rose-500" style={isPrivacyEnabled && { color: '#cbd5e1' }}>
                                    {formatValue(summary.currentMonth.expense)}
                                </Text>
                            </View>
                            <View className="flex-1 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                                <View className="flex-row items-center gap-2 mb-1">
                                    <MaterialIcons name="account-balance-wallet" size={16} color="#6366f1" />
                                    <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Saldo</Text>
                                </View>
                                <Text className="text-lg font-black text-indigo-600" style={isPrivacyEnabled && { color: '#cbd5e1' }}>
                                    {formatValue(summary.balance)}
                                </Text>
                            </View>
                        </View>
                        {/* Trends */}
                        <View className="flex-row gap-3 mt-2">
                            <View className="flex-1 flex-row items-center gap-1">
                                <MaterialIcons
                                    name={summary.currentMonth.incomeTrend >= 0 ? "arrow-upward" : "arrow-downward"}
                                    size={14}
                                    color={summary.currentMonth.incomeTrend >= 0 ? "#10b981" : "#ef4444"}
                                />
                                <Text className="text-xs font-bold" style={{ color: summary.currentMonth.incomeTrend >= 0 ? '#10b981' : '#ef4444' }}>
                                    {Math.abs(Math.round(summary.currentMonth.incomeTrend))}%
                                </Text>
                                <Text className="text-[10px] text-slate-400 dark:text-slate-500">vs mês anterior</Text>
                            </View>
                            <View className="flex-1 flex-row items-center gap-1">
                                <MaterialIcons
                                    name={summary.currentMonth.expenseTrend >= 0 ? "arrow-upward" : "arrow-downward"}
                                    size={14}
                                    color={summary.currentMonth.expenseTrend >= 0 ? "#ef4444" : "#10b981"}
                                />
                                <Text className="text-xs font-bold" style={{ color: summary.currentMonth.expenseTrend >= 0 ? '#ef4444' : '#10b981' }}>
                                    {Math.abs(Math.round(summary.currentMonth.expenseTrend))}%
                                </Text>
                                <Text className="text-[10px] text-slate-400 dark:text-slate-500">vs mês anterior</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Rule 50/30/20 */}
                {summary?.rule503020 && (
                    <View className="mx-6 mb-4 bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <View className="mb-4">
                            <Text className="text-sm font-bold text-slate-800 dark:text-white">Regra 50/30/20</Text>
                            <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Distribuição da Renda</Text>
                        </View>

                        {/* Visual Bar */}
                        <View className="flex-row h-8 rounded-xl overflow-hidden mb-4">
                            {ruleSegments.map((seg, i) => (
                                <View
                                    key={i}
                                    style={{
                                        width: `${Math.max(seg.percent, 2)}%`,
                                        backgroundColor: seg.color,
                                    }}
                                    className="items-center justify-center"
                                >
                                    {seg.percent >= 10 && (
                                        <Text className="text-[9px] font-black text-white">{seg.percent}%</Text>
                                    )}
                                </View>
                            ))}
                        </View>

                        {/* Detail Rows */}
                        {ruleSegments.map((seg, i) => (
                            <View key={i} className="flex-row items-center justify-between mb-3">
                                <View className="flex-row items-center gap-2 flex-1">
                                    <View className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
                                    <Text className="text-xs font-bold text-slate-600 dark:text-slate-300">{seg.label}</Text>
                                    <Text className="text-[10px] text-slate-400 dark:text-slate-500">ideal {seg.ideal}%</Text>
                                </View>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-xs font-black text-slate-800 dark:text-white" style={isPrivacyEnabled && { color: '#cbd5e1' }}>
                                        {formatValue(seg.value)}
                                    </Text>
                                    <View className={`px-2 py-0.5 rounded-full ${seg.percent <= seg.ideal + 5 ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-amber-50'}`}>
                                        <Text className={`text-[10px] font-bold ${seg.percent <= seg.ideal + 5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                            {seg.percent}%
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Category Pie Chart */}
                {categoryChartData.length > 0 && (
                    <View className="mx-6 mb-4 bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <View className="mb-4">
                            <Text className="text-sm font-bold text-slate-800 dark:text-white">Gastos por Categoria</Text>
                            <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Despesas do Mês</Text>
                        </View>

                        {categoryChartData.length > 0 && (
                            <View className="items-center">
                                <PieChart
                                    data={categoryChartData}
                                    donut
                                    sectionAutoFocus
                                    radius={80}
                                    innerRadius={55}
                                    innerCircleColor={'#ffffff'}
                                    centerLabelComponent={() => (
                                        <View className="items-center justify-center">
                                            <Text className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Despesas</Text>
                                            <Text className="text-lg font-black text-slate-800 dark:text-white" style={isPrivacyEnabled && { color: '#cbd5e1' }}>
                                                {formatValue(summary?.currentMonth?.expense)}
                                            </Text>
                                        </View>
                                    )}
                                />
                            </View>
                        )}

                        {/* Legend */}
                        <View className="mt-4 gap-2">
                            {summary?.categorySummary?.slice(0, 6).map((item, index) => (
                                <View key={index} className="flex-row items-center justify-between">
                                    <View className="flex-row items-center gap-2 flex-1">
                                        <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                        <Text className="text-xs font-bold text-slate-600 dark:text-slate-300" numberOfLines={1}>{item.name}</Text>
                                    </View>
                                    <Text className="text-xs font-black text-slate-800 dark:text-white" style={isPrivacyEnabled && { color: '#cbd5e1' }}>
                                        {formatValue(item.value)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Monthly Bar Chart */}
                {filteredMonthlyHistory.length > 0 && (
                    <View className="mx-6 mb-4 bg-white dark:bg-slate-900 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <View className="mb-2">
                            <Text className="text-sm font-bold text-slate-800 dark:text-white">Performance Mensal</Text>
                            <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Receitas vs Despesas</Text>
                        </View>

                        {/* Period Filter */}
                        <View className="flex-row gap-2 mb-4">
                            {[
                                { key: 'month' as const, label: '4M' },
                                { key: '3m' as const, label: '3M' },
                                { key: '6m' as const, label: '6M' },
                                { key: '12m' as const, label: '12M' },
                            ].map(p => (
                                <Pressable
                                    key={p.key}
                                    onPress={() => setPeriodFilter(p.key)}
                                    className={`px-3 py-1.5 rounded-full ${periodFilter === p.key ? 'bg-indigo-600' : 'bg-slate-100 dark:bg-slate-800'}`}
                                >
                                    <Text className={`text-[10px] font-bold ${periodFilter === p.key ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {p.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Bar Chart (same pattern as MonthlyBarChart) */}
                        <View style={{ height: 150, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                            {filteredMonthlyHistory.map((item, index) => {
                                const rawIncomeHeight = (item.income / maxBarValue) * 150;
                                const rawExpenseHeight = (item.expenses / maxBarValue) * 150;
                                // Minimum visible height of 4px when value > 0
                                const incomeHeight = item.income > 0 ? Math.max(rawIncomeHeight, 4) : 0;
                                const expenseHeight = item.expenses > 0 ? Math.max(rawExpenseHeight, 4) : 0;

                                return (
                                    <View key={index} className="items-center" style={{ flex: 1 }}>
                                        <View className="flex-row items-end gap-1">
                                            {incomeHeight > 0 && (
                                                <View
                                                    style={{ height: incomeHeight, width: 8, backgroundColor: '#10b981', borderRadius: 4 }}
                                                />
                                            )}
                                            {expenseHeight > 0 && (
                                                <View
                                                    style={{ height: expenseHeight, width: 8, backgroundColor: '#f43f5e', borderRadius: 4 }}
                                                />
                                            )}
                                        </View>
                                        <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase">
                                            {item.month}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>

                        {/* Legend */}
                        <View className="flex-row justify-center gap-4 mt-4">
                            <View className="flex-row items-center gap-2">
                                <View className="w-2 h-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40" />
                                <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Receitas</Text>
                            </View>
                            <View className="flex-row items-center gap-2">
                                <View className="w-2 h-2 rounded-full bg-rose-50 dark:bg-rose-950/40" />
                                <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Despesas</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Empty State */}
                {!summary && !loading && (
                    <View className="mx-6 items-center py-12">
                        <MaterialIcons name="bar-chart" size={48} color="#cbd5e1" />
                        <Text className="text-sm font-bold text-slate-400 dark:text-slate-500 mt-4">Nenhum dado disponível</Text>
                        <Text className="text-xs text-slate-300 mt-1">Adicione transações para ver relatórios</Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}