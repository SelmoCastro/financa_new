import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { getStartOfDay, getYearMonth, parseDate } from '../../utils/dateUtils';
import api from '../../services/api';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet, Platform, DeviceEventEmitter, Alert, useColorScheme } from 'react-native';
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
import { CategoryChart } from '../../components/CategoryChart';
import { AiInsightsWidget } from '../../components/AiInsightsWidget';
import { ImportModal } from '../../components/ImportModal';
import { FeedbackModal } from '../../components/FeedbackModal';
import SettingsModal from '../../components/SettingsModal';
import { InviteNotification } from '../../components/InviteNotification';
import { NotificationBell } from './_layout';
import { useCurrency } from '../../context/CurrencyContext';
import { useLanguage } from '../../context/LanguageContext';
import { offlineTransactionQueue } from '../../services/offlineTransactionQueue';


export default function DashboardScreen() {
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const styles = useMemo(() => createStyles(isDark), [isDark]);
    const { selectedDate } = useMonth();
    const { transactions, loading, refreshing, onRefresh, isPrivacyEnabled, togglePrivacy } = useTransactions();
    const { formatCurrency } = useCurrency();
    const { t, language } = useLanguage();

    const [modalVisible, setModalVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

    const [accounts, setAccounts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        const fetchFiltersData = async () => {
            try {
                const [accRes, catRes] = await Promise.all([
                    api.get('/accounts'),
                    api.get('/categories')
                ]);
                setAccounts(accRes.data);
                setCategories(catRes.data);
            } catch (err) {
                console.error('Error fetching data for import:', err);
            }
        };
        fetchFiltersData();

        // Re-fetch when token is refreshed
        const sub = DeviceEventEmitter.addListener('auth:token-refreshed', () => {
            fetchFiltersData();
        });
        return () => sub.remove();
    }, []);

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

    // Re-fetch summary when token is refreshed (e.g. after returning from background)
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('auth:token-refreshed', () => {
            fetchSummary();
        });
        return () => sub.remove();
    }, [fetchSummary]);

    const handleRefresh = async () => {
        await onRefresh();
        await fetchSummary();
    };

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('transactions:offline-queue-synced', () => {
            handleRefresh();
        });
        return () => sub.remove();
    }, [handleRefresh]);

    const pendingAdjustments = useMemo(() => {
        const { year: targetYear, month: targetMonth } = getYearMonth(selectedDate);
        const seen = new Set<string>();

        return transactions.reduce((acc, transaction) => {
            if (!transaction.pendingSync) return acc;

            const logicalId = transaction.offlineLocalId || transaction.id;
            const amount = Number(transaction.amount) || 0;
            const isExpense = transaction.type === 'EXPENSE';
            const signedAmount = isExpense ? -amount : amount;

            acc.balance += signedAmount;

            const date = parseDate(transaction.date);
            const { year, month } = getYearMonth(date);
            if (year === targetYear && month === targetMonth) {
                // Transfers create one pending income and one pending expense locally.
                // Keep them out of income/expense cards to avoid inflating monthly movement;
                // their net effect is still represented in balance as zero.
                if (!transaction.offlineTransferGroupId && !seen.has(logicalId)) {
                    if (isExpense) acc.currentExpense += amount;
                    else acc.currentIncome += amount;
                    seen.add(logicalId);
                }
            }

            return acc;
        }, { balance: 0, currentIncome: 0, currentExpense: 0 });
    }, [transactions, selectedDate]);

    const totals = useMemo(() => {
        if (!dashboardSummary) {
            return {
                balance: pendingAdjustments.balance,
                income: pendingAdjustments.currentIncome,
                currentIncome: pendingAdjustments.currentIncome,
                currentExpense: pendingAdjustments.currentExpense,
                incomeTrend: 0,
                expenseTrend: 0,
            };
        }
        return {
            balance: (dashboardSummary.balance || 0) + pendingAdjustments.balance,
            income: (dashboardSummary.currentMonth?.income || 0) + pendingAdjustments.currentIncome,
            currentIncome: (dashboardSummary.currentMonth?.income || 0) + pendingAdjustments.currentIncome,
            currentExpense: (dashboardSummary.currentMonth?.expense || 0) + pendingAdjustments.currentExpense,
            incomeTrend: dashboardSummary.currentMonth?.incomeTrend || 0,
            expenseTrend: dashboardSummary.currentMonth?.expenseTrend || 0
        };
    }, [dashboardSummary, pendingAdjustments]);

    const forecast = useFixedTransactions(transactions, totals);

    const topVillains = useMemo(() => {
        if (!forecast?.topVillains) return [];
        return forecast.topVillains.slice(0, 3);
    }, [forecast.topVillains]);

    const pendingOfflineCount = useMemo(
        () => {
            const uniqueIds = new Set<string>();
            transactions.forEach((transaction) => {
                if (transaction.pendingSync) {
                    uniqueIds.add(transaction.offlineLocalId || transaction.id);
                }
            });
            return uniqueIds.size;
        },
        [transactions]
    );

    const [syncing, setSyncing] = useState(false);
    const handleSyncNow = useCallback(async () => {
        if (syncing || pendingOfflineCount === 0) return;
        setSyncing(true);
        try {
            const result = await offlineTransactionQueue.syncPendingTransactionQueue();
            if (result.synced > 0) {
                const plural = language === 'en' ? (result.synced === 1 ? 'y' : 'ies') : (result.synced > 1 ? 's' : '');
                const sentPlural = language === 'en' ? '' : (result.synced > 1 ? 's' : '');
                Alert.alert(
                    t('dashboard.sync.successTitle'),
                    t('dashboard.sync.successBody', { count: result.synced, plural, sentPlural })
                );
                handleRefresh();
            }
            if (result.errors && result.errors.length > 0) {
                const msgs = result.errors.map(e => {
                    const desc = e.description?.substring(0, 40) || t('dashboard.sync.defaultDescription');
                    const cleanError = typeof e.error === 'string' ? e.error.split(',').pop()?.trim() || e.error : t('dashboard.sync.unknownError');
                    return `• ${desc}: ${cleanError}`;
                });
                Alert.alert(t('dashboard.sync.errorTitle'), msgs.join('\n'));
            } else if (result.synced === 0 && result.remaining > 0) {
                const plural = language === 'en' ? (result.remaining === 1 ? 'y' : 'ies') : (result.remaining > 1 ? 's' : '');
                Alert.alert(
                    t('dashboard.sync.attentionTitle'),
                    t('dashboard.sync.remainingBody', { count: result.remaining, plural })
                );
            }
        } catch (error) {
            Alert.alert(t('settings.error'), t('dashboard.sync.connectionError'));
        } finally {
            setSyncing(false);
        }
    }, [syncing, pendingOfflineCount, handleRefresh]);

    const formatValue = (value: number | undefined | null) => {
        if (isPrivacyEnabled) return '••••';
        return formatCurrency(value || 0);
    };

    const monthlyChartData = useMemo(() => {
        if (!dashboardSummary?.monthlyHistory) return [];
        // The mobile chart typically shows the last 4 months to avoid horizontal cramps
        return dashboardSummary.monthlyHistory.slice(-4);
    }, [dashboardSummary]);

    const rule503020 = useMemo(() => {
        if (!dashboardSummary || !dashboardSummary.rule503020) return null;
        return dashboardSummary.rule503020;
    }, [dashboardSummary]);

    return (
        <View style={[styles.container, { position: 'relative' }]}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing || summaryLoading} onRefresh={handleRefresh} />}
            >
                {/* Header */}
                <View style={[styles.header, { paddingTop: Math.max(insets.top + 20, 50) }]}>
                    {/* Top Row: Welcome & Profile Actions */}
                    <View style={styles.headerTopRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.welcomeText} numberOfLines={1}>{t('dashboard.welcomeBack')}</Text>
                        </View>
                        <View style={styles.headerButtonsSmall}>
                            <NotificationBell />
                            <InviteNotification />
                            <Pressable
                                onPress={() => { togglePrivacy(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                android_ripple={{ color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }}
                                hitSlop={15}
                                style={styles.btnSecondarySmall}
                            >
                                <MaterialIcons name={isPrivacyEnabled ? "visibility-off" : "visibility"} size={20} color={isDark ? '#cbd5e1' : '#64748b'} />
                            </Pressable>
                            <Pressable
                                onPress={() => { setFeedbackModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                android_ripple={{ color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }}
                                hitSlop={15}
                                style={styles.btnSecondarySmall}
                            >
                                <MaterialIcons name="rate-review" size={20} color={isDark ? '#cbd5e1' : '#64748b'} />
                            </Pressable>
                            <Pressable
                                onPress={() => { setSettingsModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                android_ripple={{ color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }}
                                hitSlop={15}
                                style={styles.btnSecondarySmall}
                            >
                                <MaterialIcons name="settings" size={20} color={isDark ? '#cbd5e1' : '#64748b'} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Main Row: Title */}
                    <View style={styles.headerMainRow}>
                        <Text style={styles.titleText} numberOfLines={1}>{t('dashboard.title')}</Text>
                    </View>

                    {/* Bottom Row: Month Selector */}
                    <View style={styles.headerBottomRow}>
                        <MonthSelector />
                    </View>

                    {/* Quick Actions Row */}
                    <View style={styles.quickActionsContainer}>
                        <Pressable
                            onPress={() => { openModal('EXPENSE'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                            style={[styles.quickActionBtn, styles.quickActionAdd]}
                        >
                            <MaterialIcons name="add-circle-outline" size={20} color="white" />
                            <Text style={styles.quickActionTextLight}>{t('dashboard.quickAdd')}</Text>
                        </Pressable>

                        <Pressable
                            onPress={() => { setImportModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                            style={[styles.quickActionBtn, styles.quickActionImport]}
                        >
                            <MaterialIcons name="document-scanner" size={20} color="white" />
                            <Text style={styles.quickActionTextLight}>{t('dashboard.quickImport')}</Text>
                            <View style={styles.proBadge}><MaterialIcons name="auto-awesome" size={10} color="#059669" /></View>
                        </Pressable>
                    </View>

                    {pendingOfflineCount > 0 && (
                        <Pressable
                            onPress={handleSyncNow}
                            disabled={syncing}
                            style={({ pressed }) => [
                                styles.pendingOfflineBanner,
                                { opacity: syncing ? 0.6 : pressed ? 0.85 : 1 }
                            ]}
                            android_ripple={{ color: 'rgba(180,83,9,0.2)' }}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={styles.pendingOfflineTitle}>
                                    {t('dashboard.pendingSyncTitle', {
                                        count: pendingOfflineCount,
                                        plural: language === 'en'
                                            ? (pendingOfflineCount === 1 ? 'y' : 'ies')
                                            : (pendingOfflineCount > 1 ? 's' : ''),
                                    })}
                                </Text>
                                <Text style={styles.pendingOfflineSubtitle}>
                                    {syncing ? t('dashboard.pendingSyncSubtitle.syncing') : t('dashboard.pendingSyncSubtitle.idle')}
                                </Text>
                            </View>
                            <MaterialIcons name={syncing ? 'sync' : 'cloud-upload'} size={20} color="#b45309" />
                        </Pressable>
                    )}

                    {/* Cards Grid */}
                    <View style={styles.cardsGrid}>
                        <View style={[
                            styles.card,
                            forecast.availableReal < 0 ? styles.cardRed : styles.cardPrimary,
                            styles.glassEffect
                        ]}>
                            <View style={styles.cardLabelRow}>
                                <MaterialIcons 
                                    name={forecast.availableReal < 0 ? "warning" : "account-balance-wallet"} 
                                    size={16} 
                                    color={forecast.availableReal < 0 ? "#e11d48" : "#e0e7ff"} 
                                />
                                <Text style={[
                                    styles.cardLabelPrimary,
                                    forecast.availableReal < 0 ? { color: "#e11d48" } : null
                                ]}>{t('dashboard.availableMonth')}</Text>
                            </View>
                            <Text style={[
                                styles.cardValuePrimary,
                                forecast.availableReal < 0 ? { color: "#9f1239" } : null
                            ]}>{formatValue(forecast.availableReal)}</Text>
                        </View>

                        <View style={[styles.card, styles.cardWhite, styles.glassEffectLight]}>
                            <View style={styles.cardLabelRow}>
                                <MaterialIcons name="account-balance-wallet" size={16} color="#4f46e5" />
                                <Text style={styles.cardLabelSecondary}>{t('dashboard.currentBalance')}</Text>
                            </View>
                            <Text style={styles.cardValueSecondary}>{formatValue(totals.balance)}</Text>
                        </View>

                        <View style={[styles.card, styles.cardGreen, styles.glassEffectGreen]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={[styles.cardLabelGreen, { marginBottom: 0 }]}>{t('dashboard.monthIncome')}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                                    <MaterialIcons name={totals.incomeTrend >= 0 ? "trending-up" : "trending-down"} size={10} color="#059669" />
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#059669', marginLeft: 2 }}>{Math.abs(totals.incomeTrend).toFixed(1)}%</Text>
                                </View>
                            </View>
                            <Text style={styles.cardValueGreen}>{formatValue(totals.currentIncome)}</Text>
                        </View>

                        <View style={[styles.card, styles.cardRed, styles.glassEffectRed]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Text style={[styles.cardLabelRed, { marginBottom: 0 }]}>{t('dashboard.monthExpense')}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffe4e6', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                                    <MaterialIcons name={totals.expenseTrend <= 0 ? "trending-down" : "trending-up"} size={10} color="#e11d48" />
                                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#e11d48', marginLeft: 2 }}>{Math.abs(totals.expenseTrend).toFixed(1)}%</Text>
                                </View>
                            </View>
                            <Text style={styles.cardValueRed}>{formatValue(totals.currentExpense)}</Text>
                        </View>
                    </View>
                </View>

                {/* AI Insights Widget */}
                <AiInsightsWidget />

                {loading || summaryLoading ? (
                    <View style={{ paddingHorizontal: 16, gap: 16 }}>
                        {/* Skeleton Sincronizado */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                            {[0, 1, 2, 3].map(i => (
                                <View key={i} style={styles.skeletonCard}>
                                    <Skeleton width={80} height={12} style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }} />
                                    <Skeleton width={100} height={20} style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }} />
                                </View>
                            ))}
                        </View>
                        <Skeleton width="100%" height={250} borderRadius={32} style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }} />
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: 16, gap: 16 }}>
                        {/* Monthly Chart */}
                        {monthlyChartData.length > 0 ? (
                            <MonthlyBarChart data={monthlyChartData} isPrivacyEnabled={isPrivacyEnabled} />
                        ) : (
                            <View style={styles.emptyStateContainer}>
                                <View style={styles.emptyStateIconWrapper}>
                                    <MaterialIcons name="show-chart" size={32} color="#94a3b8" />
                                </View>
                                <Text style={styles.emptyStateTitle}>{t('dashboard.noRecordsTitle')}</Text>
                                <Text style={styles.emptyStateSubtitle}>
                                    {t('dashboard.noRecordsSubtitle')}
                                </Text>
                            </View>
                        )}

                        {/* Category Chart */}
                        {dashboardSummary?.categorySummary && dashboardSummary.categorySummary.length > 0 && (
                            <CategoryChart 
                                data={dashboardSummary.categorySummary} 
                                isPrivacyEnabled={isPrivacyEnabled} 
                            />
                        )}

                        {/* Rule 50/30/20 Detailed */}
                        {rule503020 && (
                            <View style={styles.sectionCard}>
                                <View style={styles.sectionRow}>
                                    <View>
                                        <Text style={styles.sectionLabel}>{t('dashboard.financialHealth')}</Text>
                                        <Text style={styles.sectionTitle}>{t('dashboard.rule503020')}</Text>
                                    </View>
                                    <MaterialIcons name="pie-chart" size={20} color="#4f46e5" />
                                </View>

                                <View style={{ gap: 16, marginTop: 16 }}>
                                    {/* Needs */}
                                    <View style={{ gap: 6 }}>
                                        <View style={styles.ruleLabelRow}>
                                            <Text style={styles.ruleLabel}>{t('dashboard.rule.needs')}</Text>
                                            <Text style={styles.ruleValue}>{rule503020.needs?.percent.toFixed(1)}%</Text>
                                        </View>
                                        <View style={styles.ruleProgressBar}>
                                            <View style={[styles.ruleProgressFill, { width: `${Math.max(Math.min(rule503020.needs?.percent || 0, 100), (rule503020.needs?.value || 0) > 0 ? 2 : 0)}%`, backgroundColor: (rule503020.needs?.percent || 0) > 50 ? '#f43f5e' : '#10b981' }]} />
                                        </View>
                                    </View>

                                    {/* Wants */}
                                    <View style={{ gap: 6 }}>
                                        <View style={styles.ruleLabelRow}>
                                            <Text style={styles.ruleLabel}>{t('dashboard.rule.wants')}</Text>
                                            <Text style={styles.ruleValue}>{rule503020.wants?.percent.toFixed(1)}%</Text>
                                        </View>
                                        <View style={styles.ruleProgressBar}>
                                            <View style={[styles.ruleProgressFill, { width: `${Math.max(Math.min(rule503020.wants?.percent || 0, 100), (rule503020.wants?.value || 0) > 0 ? 2 : 0)}%`, backgroundColor: (rule503020.wants?.percent || 0) > 30 ? '#eab308' : '#6366f1' }]} />
                                        </View>
                                    </View>

                                    {/* Goals */}
                                    <View style={{ gap: 6 }}>
                                        <View style={styles.ruleLabelRow}>
                                            <Text style={styles.ruleLabel}>{t('dashboard.rule.savings')}</Text>
                                            <Text style={styles.ruleValue}>{rule503020.savings?.percent.toFixed(1)}%</Text>
                                        </View>
                                        <View style={styles.ruleProgressBar}>
                                            <View style={[styles.ruleProgressFill, { width: `${Math.max(Math.min(rule503020.savings?.percent || 0, 100), (rule503020.savings?.value || 0) > 0 ? 2 : 0)}%`, backgroundColor: '#3b82f6' }]} />
                                        </View>
                                    </View>

                                    {/* Uncategorized */}
                                    {rule503020.uncategorized && rule503020.uncategorized.value > 0 && (
                                        <View style={{ gap: 6 }}>
                                            <View style={styles.ruleLabelRow}>
                                                <Text style={styles.ruleLabel}>{t('dashboard.rule.other')}</Text>
                                                <Text style={styles.ruleValue}>{rule503020.uncategorized.percent.toFixed(1)}%</Text>
                                            </View>
                                            <View style={styles.ruleProgressBar}>
                                                <View style={[styles.ruleProgressFill, { width: `${Math.max(Math.min(rule503020.uncategorized.percent || 0, 100), rule503020.uncategorized.value > 0 ? 2 : 0)}%`, backgroundColor: '#94a3b8' }]} />
                                            </View>
                                            <Text style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{t('dashboard.rule.uncategorized')}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Fixed Pending */}
                        <View style={styles.sectionCard}>
                            <Text style={[styles.sectionLabel, { marginBottom: 16 }]}>{t('dashboard.fixedPending')}</Text>
                            {forecast.missingFixed.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 24, opacity: 0.5 }}>
                                    <MaterialIcons name="check-circle-outline" size={48} color="#10b981" />
                                    <Text style={styles.emptyTitle}>{t('dashboard.allPaidTitle')}</Text>
                                    <Text style={styles.emptySubtitle}>{t('dashboard.allPaidSubtitle')}</Text>
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
                                <Text style={styles.sectionLabel}>{t('dashboard.topExpenses')}</Text>
                                <MaterialIcons name="trending-down" size={16} color="#eab308" />
                            </View>
                            {topVillains.length === 0 ? (
                                <View style={{ alignItems: 'center', paddingVertical: 24, opacity: 0.5 }}>
                                    <MaterialIcons name="savings" size={48} color="#eab308" />
                                    <Text style={styles.emptyTitle}>{t('dashboard.noHighExpenseTitle')}</Text>
                                    <Text style={styles.emptySubtitle}>{t('dashboard.noHighExpenseSubtitle')}</Text>
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

            <ImportModal
                visible={importModalVisible}
                onClose={() => setImportModalVisible(false)}
                onSuccess={handleRefresh}
                accounts={accounts}
                categories={categories}
            />

            <FeedbackModal
                visible={feedbackModalVisible}
                onClose={() => setFeedbackModalVisible(false)}
            />

            <SettingsModal
                visible={settingsModalVisible}
                onClose={() => setSettingsModalVisible(false)}
            />

            {/* Global FAB (Floating Action Button) */}
            <Pressable
                style={({ pressed }) => [
                    styles.fabButton,
                    pressed && styles.fabButtonPressed
                ]}
                onPress={() => { openModal('EXPENSE'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            >
                <MaterialIcons name="add" size={32} color="white" />
            </Pressable>
        </View>
    );
}

const createStyles = (isDark: boolean) => StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' },
    header: { backgroundColor: isDark ? '#0f172a' : 'white', paddingHorizontal: 24, paddingBottom: 24, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, shadowColor: '#000', shadowOpacity: isDark ? 0.18 : 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3, marginBottom: 24 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, zIndex: 10, elevation: 10 },
    headerMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerBottomRow: { flexDirection: 'row', alignItems: 'center' },
    welcomeText: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: '500' },
    titleText: { fontSize: 22, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', flex: 1, marginRight: 12 },
    headerButtonsSmall: { flexDirection: 'row', gap: 8 },
    btnPrimary: { backgroundColor: '#4f46e5', borderRadius: 16, padding: 10, shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    btnSecondarySmall: { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 12, padding: 8 },
    btnSecondary: { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 999, padding: 8 },
    cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
    card: { width: '48%', padding: 16, borderRadius: 24 },
    glassEffect: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    glassEffectLight: {
        borderWidth: 1,
        borderColor: isDark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(79, 70, 229, 0.1)',
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
    cardWhite: { backgroundColor: isDark ? '#0f172a' : 'white', shadowColor: '#000', shadowOpacity: isDark ? 0.16 : 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
    cardGreen: { backgroundColor: isDark ? '#052e16' : '#f0fdf4' },
    cardRed: { backgroundColor: isDark ? '#4c0519' : '#fff1f2' },
    cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    cardLabelPrimary: { color: '#c7d2fe', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    cardLabelSecondary: { color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    cardLabelGreen: { color: isDark ? '#6ee7b7' : '#059669', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    cardLabelRed: { color: isDark ? '#fda4af' : '#e11d48', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    cardValuePrimary: { color: 'white', fontSize: 20, fontWeight: '900' },
    cardValueSecondary: { color: isDark ? '#f8fafc' : '#1e293b', fontSize: 20, fontWeight: '900' },
    cardValueGreen: { color: isDark ? '#a7f3d0' : '#065f46', fontSize: 18, fontWeight: '900' },
    cardValueRed: { color: isDark ? '#fecdd3' : '#9f1239', fontSize: 18, fontWeight: '900' },
    skeletonCard: { width: '48%', backgroundColor: isDark ? '#0f172a' : 'white', padding: 16, borderRadius: 24, shadowColor: '#000', shadowOpacity: isDark ? 0.16 : 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1, height: 100, justifyContent: 'space-between', borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
    sectionCard: { backgroundColor: isDark ? '#0f172a' : 'white', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9', shadowColor: '#000', shadowOpacity: isDark ? 0.16 : 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, marginBottom: 16 },
    sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b', marginTop: 2 },
    sectionLabel: { fontSize: 13, fontWeight: '900', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: 1.5 },
    ruleLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    ruleLabel: { fontSize: 12, fontWeight: '700', color: isDark ? '#cbd5e1' : '#64748b' },
    ruleValue: { fontSize: 12, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b' },
    ruleProgressBar: { height: 8, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
    ruleProgressFill: { height: '100%', borderRadius: 4 },
    badge: { backgroundColor: isDark ? '#312e81' : '#e0e7ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    badgeText: { fontSize: 11, fontWeight: '700', color: isDark ? '#c7d2fe' : '#4338ca' },
    progressBar: { height: 16, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 999, overflow: 'hidden', flexDirection: 'row', marginBottom: 8 },
    progressFill: { height: '100%', backgroundColor: isDark ? '#cbd5e1' : '#1e293b' },
    progressRemainder: { height: '100%', backgroundColor: '#34d399', flex: 1 },
    subtleText: { fontSize: 12, color: isDark ? '#64748b' : '#94a3b8' },
    listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' },
    listTitle: { fontSize: 14, fontWeight: '700', color: isDark ? '#e2e8f0' : '#334155' },
    listValueRed: { fontSize: 14, fontWeight: '900', color: '#f43f5e' },
    listValueDark: { fontSize: 14, fontWeight: '900', color: isDark ? '#f8fafc' : '#1e293b' },
    emptyTitle: { fontSize: 14, fontWeight: '700', color: isDark ? '#cbd5e1' : '#64748b', marginTop: 8 },
    emptySubtitle: { fontSize: 12, color: isDark ? '#94a3b8' : '#94a3b8', textAlign: 'center', marginTop: 4 },
    rankBadge: { width: 24, height: 24, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
    rankText: { fontSize: 13, fontWeight: '700', color: isDark ? '#cbd5e1' : '#64748b' },

    // Quick Actions
    quickActionsContainer: { flexDirection: 'row', gap: 12, marginBottom: 20, marginTop: 4 },
    quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4, shadowOffset: { width: 0, height: 4 } },
    quickActionAdd: { backgroundColor: '#4f46e5', shadowColor: '#4f46e5' },
    quickActionImport: { backgroundColor: '#10b981', shadowColor: '#10b981' },
    quickActionTextLight: { color: 'white', fontWeight: '800', fontSize: 14 },
    proBadge: { backgroundColor: isDark ? '#064e3b' : '#dcfce7', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, marginLeft: 2 },

    // Empty State
    emptyStateContainer: { backgroundColor: isDark ? '#0f172a' : 'white', padding: 32, borderRadius: 32, borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: 16, minHeight: 250 },
    emptyStateIconWrapper: { width: 64, height: 64, backgroundColor: isDark ? '#020617' : '#f8fafc', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
    emptyStateTitle: { fontSize: 16, fontWeight: '800', color: isDark ? '#e2e8f0' : '#334155', marginBottom: 8 },
    emptyStateSubtitle: { fontSize: 13, color: isDark ? '#94a3b8' : '#64748b', textAlign: 'center', lineHeight: 20 },

    // FAB principal
    fabButton: { position: 'absolute', right: 24, bottom: 32, width: 64, height: 64, borderRadius: 32, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 10, zIndex: 9999 },
    fabButtonPressed: { transform: [{ scale: 0.92 }], opacity: 0.9 },
    pendingOfflineBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: isDark ? '#422006' : '#fffbeb', borderColor: '#fcd34d', borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16, marginBottom: 8 },
    pendingOfflineTitle: { fontSize: 13, fontWeight: '900', color: isDark ? '#fde68a' : '#92400e' },
    pendingOfflineSubtitle: { fontSize: 11, color: isDark ? '#fbbf24' : '#b45309', marginTop: 2, lineHeight: 15 },
});
