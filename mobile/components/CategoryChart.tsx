import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface CategoryData {
    name: string;
    value: number;
}

interface CategoryChartProps {
    data: CategoryData[];
    isPrivacyEnabled: boolean;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export const CategoryChart: React.FC<CategoryChartProps> = ({ data, isPrivacyEnabled }) => {
    const { formatCurrency } = useCurrency();
    const { t } = useLanguage();

    const totalValue = React.useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

    const chartData = React.useMemo(() => data.map((item, index) => ({
        value: item.value,
        color: COLORS[index % COLORS.length],
        text: item.name
    })), [data]);

    const renderCenterLabel = React.useCallback(() => (
        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>{t('category.centerLabel')}</Text>
            <Text style={{ fontSize: 18, color: '#1e293b', fontWeight: '900' }}>
                {totalValue > 0 ? t('category.centerPercent') : t('category.centerEmpty')}
            </Text>
        </View>
    ), [t, totalValue]);

    if (!data || data.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('category.title')}</Text>
                <Text style={styles.subtitle}>{t('category.subtitle')}</Text>
            </View>

            <View style={styles.chartWrapper}>
                <PieChart
                    data={chartData}
                    donut
                    sectionAutoFocus
                    radius={80}
                    innerRadius={60}
                    innerCircleColor={'#ffffff'}
                    centerLabelComponent={renderCenterLabel}
                />
            </View>

            <View style={styles.legendContainer}>
                {data.slice(0, 5).map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                        <View style={styles.legendLabelGroup}>
                            <View style={[styles.dot, { backgroundColor: COLORS[index % COLORS.length] }]} />
                            <Text style={styles.legendText} numberOfLines={1}>{item.name}</Text>
                        </View>
                        <Text style={[styles.legendValue, isPrivacyEnabled && styles.privacyBlur]}>
                            {isPrivacyEnabled ? '••••' : formatCurrency(item.value)}
                        </Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 24,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
        marginBottom: 16,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1e293b',
    },
    subtitle: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    chartWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
    },
    legendContainer: {
        marginTop: 20,
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    legendLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#475569',
    },
    legendValue: {
        fontSize: 13,
        fontWeight: '900',
        color: '#1e293b',
    },
    privacyBlur: {
        color: '#cbd5e1',
    }
});
