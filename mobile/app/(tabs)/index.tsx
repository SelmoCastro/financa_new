import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { getStartOfDay, getYearMonth, parseDate } from '../../utils/dateUtils';
import api from '../../services/api';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { Skeleton } from '../../components/Skeleton';
import { useFixedTransactions } from '../../hooks/useFixedTransactions';
import { useMonth } from '../../context/MonthContext';
import { MonthSelector } from '../../components/MonthSelector';
import TransactionModal from '../../components/TransactionModal';
import { MonthlyBarChart } from '../../components/MonthlyBarChart';

export default function DashboardScreen() {
    const insets = useSafeAreaInsets();
    const { selectedDate } = useMonth();
    const { transactions, loading, refreshing, onRefresh, isPrivacyEnabled, togglePrivacy } = useTransactions();

    const [modalVisible, setModalVisible] = useState(false);
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

    const openModal = (type: 'INCOME' | 'EXPENSE') => {
        setTransactionType(type);
        setModalVisible(true);
    };

    const [dashboardSummary, setDashboardSummary] = useState<any>(null);
    const [summaryLoading, setSummaryLoading] = useState(true);

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const { year, month } = getYearMonth(selectedDate);
            const res = await api.get(`/transactions/dashboard-summary?year=${year}&month=${month}`);
            setDashboardSummary(res.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setSummaryLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const handleRefresh = async () => {
        await onRefresh();
        await fetchSummary();
    };

    const totals = useMemo(() => {
        if (!dashboardSummary) return { balance: 0, currentIncome: 0, currentExpense: 0, income: 0 };
        return {
            balance: dashboardSummary.balance || 0,
            currentIncome: dashboardSummary.currentMonth?.income || 0,
            currentExpense: dashboardSummary.currentMonth?.expense || 0,
            income: 0
        };
    }, [dashboardSummary]);

    const forecast = useFixedTransactions(transactions, totals);

    const topVillains = useMemo(() => {
        if (!forecast || !forecast.topVillains) return [];
        return forecast.topVillains.slice(0, 3);
    }, [forecast]);

    const formatValue = (value: number | undefined | null) => {
        if (isPrivacyEnabled) return '••••';
        const safeValue = Number(value) || 0;
        return `R$ ${safeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    const monthlyChartData = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];
        const groupedByMonth: Record<string, { income: number; expenses: number }> = {};

        // Pegar últimos 4 meses para o gráfico mobile não ficar poluído
        transactions.forEach(t => {
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = { income: 0, expenses: 0 };
            if (t.type === 'INCOME') groupedByMonth[monthKey].income += Number(t.amount);
            else groupedByMonth[monthKey].expenses += Number(t.amount);
        });

        return Object.keys(groupedByMonth).sort().slice(-4).map(key => {
            const [year, month] = key.split('-');
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
            const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            return {
                month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                income: groupedByMonth[key].income,
                expenses: groupedByMonth[key].expenses
            };
        });
    }, [transactions]);

    const rule503020 = useMemo(() => {
        if (!dashboardSummary || !dashboardSummary.rule503020) return null;
        return dashboardSummary.rule503020;
    }, [dashboardSummary]);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing || summaryLoading} onRefresh={handleRefresh} />}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 50) }]}>
                    {/* Top Row: Welcome & Profile Actions */}
                    <View style={styles.headerTopRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.welcomeText} numberOfLines={1}>Bem-vindo de volta,</Text>
                        </View>
                        <View style={styles.headerButtonsSmall}>
                            <Pressable
                                onPress={() => { togglePrivacy(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                                hitSlop={15}
                                style={styles.btnSecondarySmall}
                            >
                                <MaterialIcons name={isPrivacyEnabled ? "visibility-off" : "visibility"} size={20} color="#64748b" />
                            </Pressable>
                        </View>
                    </View>

                    {/* Main Row: Title & Add Button */}
                    <View style={styles.headerMainRow}>
                        <Text style={styles.titleText} numberOfLines={1}>Resumo Financeiro</Text>
                        <Pressable
                            onPress={() => { openModal('EXPENSE'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                            style={styles.btnPrimary}
                        >
                            <MaterialIcons name="add" size={24} color="white" />
                        </Pressable>
                    </View>

                    {/* Bottom Row: Month Selector */}
                    <View style={styles.headerBottomRow}>
                        <MonthSelector />
                    </View>

                    {/* Cards Grid */}
                    <View style={styles.cardsGrid}>
                        <View style={[styles.card, styles.cardPrimary, styles.glassEffect]}>
                            <View style={styles.cardLabelRow}>
                                <MaterialIcons name="track-changes" size={16} color="#e0e7ff" />
                                <Text style={styles.cardLabelPrimary}>Saldo Projetado</Text>
                            </View>
                            <Text style={styles.cardValuePrimary}>{formatValue(forecast.projectedBalance)}</Text>
                        </View>

                        <View style={[styles.card, styles.cardWhite, styles.glassEffectLight]}>
                            <View style={styles.cardLabelRow}>
                                <MaterialIcons name="account-balance-wallet" size={16} color="#4f46e5" />
                                <Text style={styles.cardLabelSecondary}>Saldo Atual</Text>
                            </View>
                            <Text style={styles.cardValueSecondary}>{formatValue(totals.balance)}</Text>
                        </View>

                        <View style={[styles.card, styles.cardGreen, styles.glassEffectGreen]}>
                            <Text style={styles.cardLabelGreen}>Entradas (Mês)</Text>
                            <Text style={styles.cardValueGreen}>{formatValue(totals.currentIncome)}</Text>
                        </View>

                        <View style={[styles.card, styles.cardRed, styles.glassEffectRed]}>
                            <Text style={styles.cardLabelRed}>Saídas (Mês)</Text>
                            <Text style={styles.cardValueRed}>{formatValue(totals.currentExpense)}</Text>
                        </View>
                    </View>
                </View>

                {loading || summaryLoading ? (
                    <View style={{ paddingHorizontal: 16, gap: 16 }}>
                        {/* Skeleton Sincronizado */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                            {[0, 1, 2, 3].map(i => (
                                <View key={i} style={styles.skeletonCard}>
                                    <Skeleton width={80} height={12} style={{ backgroundColor: '#f1f5f9' }} />
                                    <Skeleton width={100} height={20} style={{ backgroundColor: '#f1f5f9' }} />
                                </View>
                            ))}
                        </View>
                        <Skeleton width="100%" height={250} borderRadius={32} style={{ backgroundColor: '#f8fafc' }} />
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: 16, gap: 16 }}>
                        {/* Monthly Chart */}
                        {monthlyChartData.length > 0 && (
                            <MonthlyBarChart data={monthlyChartData} isPrivacyEnabled={isPrivacyEnabled} />
                        )}

                        {/* Rule 50/30/20 Detailed */}
                        {rule503020 && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionRow}>
                                    <View>
                                        <Text style={styles.sectionLabel}>Saúde Financeira</Text>
                                        <Text style={styles.sectionTitle}>Regra 50/30/20</Text>
                                    </View>
                                    <MaterialIcons name="pie-chart" size={20} color="#4f46e5" />
                                </View>

                                <View style={{ gap: 16, marginTop: 16 }}>
                                    {/* Needs */}
                                    <View style={{ gap: 6 }}>
                                        <View style={styles.ruleLabelRow}>
                                            <Text style={styles.ruleLabel}>Necessidades (50%)</Text>
                                            <Text style={styles.ruleValue}>{rule503020.needs?.percent.toFixed(1)}%</Text>
                                        </View>
                                        <View style={styles.ruleProgressBar}>
                                            <View style={[styles.ruleProgressFill, { width: `${Math.min(rule503020.needs?.percent || 0, 100)}%`, backgroundColor: (rule503020.needs?.percent || 0) > 50 ? '#f43f5e' : '#10b981' }]} />
                                        </View>
                                    </View>

                                    {/* Wants */}
                                    <View style={{ gap: 6 }}>
                                        <View style={styles.ruleLabelRow}>
                                            <Text style={styles.ruleLabel}>Desejos (30%)</Text>
                                            <Text style={styles.ruleValue}>{rule503020.wants?.percent.toFixed(1)}%</Text>
                                        </View>
                                        <View style={styles.ruleProgressBar}>
                                            <View style={[styles.ruleProgressFill, { width: `${Math.min(rule503020.wants?.percent || 0, 100)}%`, backgroundColor: (rule503020.wants?.percent || 0) > 30 ? '#eab308' : '#6366f1' }]} />
                                        </View>
                                    </View>

                                    {/* Goals */}
                                    <View style={{ gap: 6 }}>
                                        <View style={styles.ruleLabelRow}>
                                            <Text style={styles.ruleLabel}>Objetivos (20%)</Text>
                                            <Text style={styles.ruleValue}>{rule503020.savings?.percent.toFixed(1)}%</Text>
                                        </View>
                                        <View style={styles.ruleProgressBar}>
                                            <View style={[styles.ruleProgressFill, { width: `${Math.min(rule503020.savings?.percent || 0, 100)}%`, backgroundColor: '#3b82f6' }]} />
                                        </View>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Fixed Pending */}
                        <View style={styles.sectionCard}>
                            <Text style={[styles.sectionLabel, { marginBottom: 16 }]}>Fixos Pendentes</Text>
                            {forecast.missingFixed.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 24, opacity: 0.5 }}>
                                    <MaterialIcons name="check-circle-outline" size={48} color="#10b981" />
                                    <Text style={styles.emptyTitle}>Tudo pago!</Text>
                                    <Text style={styles.emptySubtitle}>Você está em dia com suas contas fixas.</Text>
                                </View>
                            ) : (
                                forecast.missingFixed.map((item, idx) => (
                                    <View key={idx} style={styles.listRow}>
                                        <Text style={styles.listTitle}>{item.description}</Text>
                                        <Text style={styles.listValueRed}>- {formatValue(item.amount)}</Text>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Top Villains */}
                        <View style={styles.sectionCard}>
                            <View style={styles.sectionRow}>
                                <Text style={styles.sectionLabel}>Top Gastos do Mês</Text>
                                <MaterialIcons name="trending-down" size={16} color="#eab308" />
                            </View>
                            {topVillains.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 24, opacity: 0.5 }}>
                                    <MaterialIcons name="savings" size={48} color="#eab308" />
                                    <Text style={styles.emptyTitle}>Nenhum gasto alto</Text>
                                    <Text style={styles.emptySubtitle}>Seus gastos estão sob controle este mês.</Text>
                                </View>
                            ) : (
                                topVillains.map((item, idx) => (
                                    <View key={idx} style={[styles.listRow, { marginBottom: idx < topVillains.length - 1 ? 12 : 0 }]}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                            <View style={styles.rankBadge}>
                                                <Text style={styles.rankText}>{idx + 1}</Text>
                                            </View>
                                            <Text style={styles.listTitle}>{item.name}</Text>
                                        </View>
                                        <Text style={styles.listValueDark}>{formatValue(item.value)}</Text>
                                    </View>
                                ))
                            )}
                        </View>
                    </View>
                )}
            </ScrollView>

            <TransactionModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={handleRefresh}
                initialType={transactionType}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { backgroundColor: 'white', paddingHorizontal: 24, paddingBottom: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, marginBottom: 24 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, zIndex: 10, elevation: 10 },
    headerMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerBottomRow: { flexDirection: 'row', alignItems: 'center' },
    welcomeText: { color: '#64748b', fontSize: 13, fontWeight: '500' },
    titleText: { fontSize: 22, fontWeight: '900', color: '#1e293b', flex: 1, marginRight: 12 },
    headerButtonsSmall: { flexDirection: 'row', gap: 8 },
    btnPrimary: { backgroundColor: '#4f46e5', borderRadius: 16, padding: 10, shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    btnSecondarySmall: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 8 },
    btnSecondary: { backgroundColor: '#f1f5f9', borderRadius: 999, padding: 8 },
    cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    card: { width: '48%', padding: 16, borderRadius: 24 },
    glassEffect: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    glassEffectLight: {
        borderWidth: 1,
        borderColor: 'rgba(79, 70, 229, 0.1)',
    },
    glassEffectGreen: {
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    glassEffectRed: {
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.2)',
    },
    cardPrimary: { backgroundColor: '#4f46e5', shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    cardWhite: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    cardGreen: { backgroundColor: '#f0fdf4' },
    cardRed: { backgroundColor: '#fff1f2' },
    cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    cardLabelPrimary: { color: '#c7d2fe', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    cardLabelSecondary: { color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    cardLabelGreen: { color: '#059669', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    cardLabelRed: { color: '#e11d48', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    cardValuePrimary: { color: 'white', fontSize: 20, fontWeight: '900' },
    cardValueSecondary: { color: '#1e293b', fontSize: 20, fontWeight: '900' },
    cardValueGreen: { color: '#065f46', fontSize: 18, fontWeight: '900' },
    cardValueRed: { color: '#9f1239', fontSize: 18, fontWeight: '900' },
    skeletonCard: { width: '48%', backgroundColor: 'white', padding: 16, borderRadius: 24, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1, height: 100, justifyContent: 'space-between', borderWidth: 1, borderColor: '#f1f5f9' },
    sectionCard: { backgroundColor: 'white', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, marginBottom: 16 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b', marginTop: 2 },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 },
    ruleLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ruleLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    ruleValue: { fontSize: 12, fontWeight: '900', color: '#1e293b' },
    ruleProgressBar: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
    ruleProgressFill: { height: '100%', borderRadius: 4 },
    badge: { backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 11, fontWeight: '700', color: '#4338ca' },
    progressBar: { height: 16, backgroundColor: '#f1f5f9', borderRadius: 999, overflow: 'hidden', flexDirection: 'row', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: '#1e293b' },
    progressRemainder: { height: '100%', backgroundColor: '#34d399', flex: 1 },
    subtleText: { fontSize: 12, color: '#94a3b8' },
    listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    listTitle: { fontSize: 14, fontWeight: '700', color: '#334155' },
    listValueRed: { fontSize: 14, fontWeight: '900', color: '#f43f5e' },
    listValueDark: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', marginTop: 8 },
    emptySubtitle: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4 },
    rankBadge: { width: 20, height: 20, backgroundColor: '#f1f5f9', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    rankText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
});
