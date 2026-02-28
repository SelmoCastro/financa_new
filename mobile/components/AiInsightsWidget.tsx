import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import api from '../services/api';
import { useMonth } from '../context/MonthContext';
import { getYearMonth } from '../utils/dateUtils';
import * as Haptics from 'expo-haptics';

export function AiInsightsWidget() {
    const { selectedDate } = useMonth();
    const [insightsData, setInsightsData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);

    const fetchInsights = async (forceRefresh: boolean = false) => {
        setLoading(true);
        setError(null);
        try {
            const { year, month } = getYearMonth(selectedDate);
            const refreshParam = forceRefresh ? '&refresh=true' : '';
            const res = await api.get(`/ai/insights?year=${year}&month=${month}${refreshParam}`);

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            if (res.data && res.data.content) {
                setInsightsData(res.data);
                setHasAnalyzed(true);
            } else {
                setInsightsData(null);
            }
        } catch (err: any) {
            console.error('Error fetching AI insights:', err);
            setError('Não foi possível carregar os insights. A IA pode estar indisponível.');
            setInsightsData(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Reset analysis state when month changes so user can manually request it again
        setInsightsData(null);
        setHasAnalyzed(false);
        setError(null);
    }, [selectedDate]);

    const handleRefresh = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        fetchInsights(true);
    };

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={24} color="#f43f5e" />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable onPress={handleRefresh} style={styles.retryButton}>
                    <Text style={styles.retryText}>Tentar Novamente</Text>
                </Pressable>
            </View>
        );
    }

    if (loading && !insightsData) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.loadingText}>A IA está analisando seu mês...</Text>
            </View>
        );
    }

    if (!insightsData || !insightsData.content) {
        if (!hasAnalyzed && !loading && !error) {
            return (
                <View style={styles.promptContainer}>
                    <View style={styles.promptHeader}>
                        <MaterialIcons name="auto-awesome" size={24} color="#8b5cf6" />
                        <Text style={styles.promptTitle}>Finanza AI</Text>
                    </View>
                    <Text style={styles.promptText}>
                        Gera um resumo inteligente dos seus gastos de {getYearMonth(selectedDate).month}/{getYearMonth(selectedDate).year} e receba alertas sobre o seu orçamento.
                    </Text>
                    <Pressable
                        style={({ pressed }) => [styles.analyzeBtn, pressed && { opacity: 0.8 }]}
                        onPress={() => fetchInsights(false)}
                    >
                        <Text style={styles.analyzeBtnText}>Analisar Mês Lançando a Magia</Text>
                    </Pressable>
                </View>
            );
        }
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <MaterialIcons name="auto-awesome" size={20} color="#8b5cf6" />
                    <Text style={styles.title}>Insights da IA</Text>
                </View>
                <Pressable onPress={handleRefresh} style={({ pressed }) => [styles.refreshButton, pressed && { opacity: 0.7 }]}>
                    {loading ? <ActivityIndicator size="small" color="#8b5cf6" /> : <MaterialIcons name="refresh" size={18} color="#94a3b8" />}
                </Pressable>
            </View>

            <View style={styles.contentContainer}>
                <Text style={styles.summaryText}>{insightsData.content.summary}</Text>

                {insightsData.content.alerts && insightsData.content.alerts.length > 0 && (
                    <View style={styles.alertsContainer}>
                        {insightsData.content.alerts.map((alert: string, idx: number) => (
                            <View key={idx} style={styles.alertRow}>
                                <Text style={styles.alertBullet}>•</Text>
                                <Text style={styles.alertText}>{alert}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
            <View style={styles.footer}>
                <Text style={styles.footerText}>Análise baseada nos gastos de {getYearMonth(selectedDate).month}/{getYearMonth(selectedDate).year}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1e1b4b', // Dark purple base
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 20,
        shadowColor: '#8b5cf6',
        shadowOpacity: 0.15,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.5,
    },
    refreshButton: {
        padding: 4,
    },
    contentContainer: {
        gap: 12,
    },
    summaryText: {
        fontSize: 14,
        color: '#e2e8f0', // slate-200
        lineHeight: 22,
        fontWeight: '500',
    },
    alertsContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 12,
        gap: 8,
    },
    alertRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    alertBullet: {
        color: '#f43f5e', // rose-500
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 20,
    },
    alertText: {
        fontSize: 13,
        color: '#cbd5e1', // slate-300
        lineHeight: 18,
        flex: 1,
    },
    footer: {
        marginTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 12,
        alignItems: 'flex-end',
    },
    footerText: {
        fontSize: 10,
        color: '#64748b', // slate-500
        fontWeight: '500',
    },
    loadingContainer: {
        backgroundColor: '#1e1b4b',
        borderRadius: 24,
        padding: 32,
        marginHorizontal: 16,
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    loadingText: {
        color: '#a5b4fc',
        fontSize: 14,
        fontWeight: '600',
    },
    errorContainer: {
        backgroundColor: '#fff1f2',
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 20,
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#fecdd3',
    },
    errorText: {
        color: '#9f1239',
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '500',
    },
    retryButton: {
        marginTop: 8,
        backgroundColor: 'white',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fecdd3',
    },
    retryText: {
        color: '#e11d48',
        fontSize: 12,
        fontWeight: '700',
    },
    promptContainer: {
        backgroundColor: '#1e1b4b',
        borderRadius: 24,
        padding: 24,
        marginHorizontal: 16,
        marginBottom: 20,
        gap: 12,
        borderWidth: 1,
        borderColor: '#312e81',
    },
    promptHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    promptTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    promptText: {
        color: '#a5b4fc',
        fontSize: 13,
        lineHeight: 20,
    },
    analyzeBtn: {
        backgroundColor: '#4f46e5',
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 4,
    },
    analyzeBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 14,
    }
});
