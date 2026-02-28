import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { useMonth } from '../../context/MonthContext';
import { MonthSelector } from '../../components/MonthSelector';
import { getYearMonth, parseDate } from '../../utils/dateUtils';
import api from '../../services/api';
import TransactionModal from '../../components/TransactionModal';
import { ImportModal } from '../../components/ImportModal';
import { useEffect } from 'react';

export default function TransactionsScreen() {
    const insets = useSafeAreaInsets();
    const { selectedDate } = useMonth();
    const { transactions, loading, refreshing, onRefresh, setTransactions, isPrivacyEnabled, togglePrivacy } = useTransactions();

    const [filter, setFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);

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
    }, []);

    // Derived
    const filteredTransactions = useMemo(() => {
        const { year: targetYear, month: targetMonth } = getYearMonth(selectedDate);

        return transactions.filter(t => {
            const date = parseDate(t.date);
            const { year, month } = getYearMonth(date);
            const matchesDate = year === targetYear && month === targetMonth;

            if (filter !== 'ALL' && t.type !== filter) return false;

            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const catName = t.category?.name || t.categoryLegacy || 'Outros';
                return t.description.toLowerCase().includes(query) || catName.toLowerCase().includes(query);
            }

            return true;
        });
    }, [transactions, filter, selectedDate, searchQuery]);

    const totals = useMemo(() => {
        return filteredTransactions.reduce((acc, t) => {
            if (t.type === 'INCOME') acc.income += Number(t.amount);
            else acc.expense += Number(t.amount);
            return acc;
        }, { income: 0, expense: 0 });
    }, [filteredTransactions]);





    const handleDelete = (id: string) => {
        Alert.alert(
            'Excluir Transação',
            'Tem certeza?',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/transactions/${id}`);
                            setTransactions(prev => prev.filter(t => t.id !== id));
                        } catch (error) {
                            Alert.alert('Erro', 'Falha ao excluir.');
                        }
                    }
                }
            ]
        );
    };

    const formatValue = (value: number | undefined | null) => {
        if (isPrivacyEnabled) return '••••';
        const safeValue = Number(value) || 0;
        return `R$ ${safeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    return (
        <View className="flex-1 bg-slate-50">
            <View className="bg-white pb-4 rounded-b-3xl shadow-sm z-10" style={{ paddingTop: insets.top + 10 }}>
                <View className="px-6 mb-4 flex-row justify-between items-center">
                    <View>
                        <View className="flex-row items-center gap-3">
                            <Text className="text-2xl font-bold text-slate-800">Extrato</Text>
                            <Pressable
                                onPress={() => { togglePrivacy(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: 24 }}
                                className="p-1 px-2 bg-slate-100 rounded-lg"
                            >
                                <MaterialIcons name={isPrivacyEnabled ? "visibility-off" : "visibility"} size={16} color="#64748b" />
                            </Pressable>
                        </View>
                        <View className="mt-2 text-center items-start">
                            <MonthSelector />
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Pressable
                            onPress={() => { setImportModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                            className="bg-emerald-600 p-2 px-3 rounded-xl flex-row items-center gap-1 shadow-lg shadow-emerald-200"
                        >
                            <MaterialIcons name="file-upload" size={18} color="white" />
                            <Text className="text-white font-bold text-xs uppercase"></Text>
                        </Pressable>
                        <Pressable
                            onPress={() => { setModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                            className="bg-indigo-600 p-2 px-4 rounded-xl flex-row items-center gap-2 shadow-lg shadow-indigo-200"
                        >
                            <MaterialIcons name="add" size={20} color="white" />
                            <Text className="text-white font-bold text-xs uppercase">Novo</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Search Bar */}
                <View className="px-6 mb-4">
                    <View className="flex-row items-center bg-slate-100 rounded-2xl px-4 py-3 border border-slate-200">
                        <MaterialIcons name="search" size={24} color="#94a3b8" />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Buscar transações..."
                            className="flex-1 ml-3 font-medium text-slate-700"
                            placeholderTextColor="#94a3b8"
                        />
                        {searchQuery.length > 0 && (
                            <Pressable
                                onPress={() => { setSearchQuery(''); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: 20 }}
                                className="p-1"
                            >
                                <MaterialIcons name="close" size={20} color="#94a3b8" />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Filter Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6" contentContainerStyle={{ paddingRight: 24, gap: 12 }}>
                    <View className={`rounded-xl overflow-hidden border ${filter === 'ALL' ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200'}`}>
                        <Pressable
                            onPress={() => { setFilter('ALL'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                            android_ripple={{ color: filter === 'ALL' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
                            className="px-4 py-2"
                        >
                            <Text className={`font-bold text-xs ${filter === 'ALL' ? 'text-white' : 'text-slate-600'}`}>Todos</Text>
                        </Pressable>
                    </View>
                    <View className={`rounded-xl overflow-hidden border ${filter === 'INCOME' ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200'}`}>
                        <Pressable
                            onPress={() => { setFilter('INCOME'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                            android_ripple={{ color: filter === 'INCOME' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
                            className="px-4 py-2"
                        >
                            <Text className={`font-bold text-xs ${filter === 'INCOME' ? 'text-white' : 'text-slate-600'}`}>Receitas</Text>
                        </Pressable>
                    </View>
                    <View className={`rounded-xl overflow-hidden border ${filter === 'EXPENSE' ? 'bg-rose-500 border-rose-500' : 'bg-white border-slate-200'}`}>
                        <Pressable
                            onPress={() => { setFilter('EXPENSE'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                            android_ripple={{ color: filter === 'EXPENSE' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }}
                            className="px-4 py-2"
                        >
                            <Text className={`font-bold text-xs ${filter === 'EXPENSE' ? 'text-white' : 'text-slate-600'}`}>Despesas</Text>
                        </Pressable>
                    </View>
                </ScrollView>

                {/* Summary for Filter */}
                {filter !== 'ALL' && (
                    <View className="px-6 mt-4">
                        <View className={`p-4 rounded-2xl ${filter === 'INCOME' ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                            <Text className={`text-xs font-bold uppercase mb-1 ${filter === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                Total {filter === 'INCOME' ? 'Receitas' : 'Despesas'}
                            </Text>
                            <Text className={`text-2xl font-black ${filter === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {formatValue(filter === 'INCOME' ? totals.income : totals.expense)}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#4f46e5" className="mt-10" />
            ) : (
                <View className="flex-1">
                    <FlashList
                        data={filteredTransactions}
                        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                        ListEmptyComponent={() => (
                            <View className="items-center py-20">
                                <MaterialIcons name="receipt-long" size={48} color="#cbd5e1" />
                                <Text className="text-slate-400 font-bold mt-4">Nenhum lançamento encontrado</Text>
                            </View>
                        )}
                        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                        renderItem={({ item: t }) => (
                            <View className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                <Pressable
                                    onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleDelete(t.id); }}
                                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                                    className="p-4 flex-row items-center justify-between"
                                    style={({ pressed }) => Platform.OS === 'ios' && pressed ? { opacity: 0.7 } : {}}
                                >
                                    <View className="flex-row items-center gap-4 flex-1">
                                        <View className={`w-10 h-10 rounded-xl items-center justify-center ${t.type === 'INCOME' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                            <MaterialIcons
                                                name={t.type === 'INCOME' ? 'arrow-upward' : 'arrow-downward'}
                                                size={20}
                                                color={t.type === 'INCOME' ? '#10b981' : '#f43f5e'}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="font-bold text-slate-700 text-sm" numberOfLines={1}>{t.description}</Text>
                                            <View className="flex-row items-center gap-2">
                                                <Text className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t.category?.name || t.categoryLegacy || 'Outros'}</Text>
                                                <Text className="text-xs text-slate-300">•</Text>
                                                <Text className="text-xs text-slate-400">{new Date(t.date).toLocaleDateString()}</Text>
                                            </View>
                                        </View>
                                    </View>
                                    <Text className={`font-black text-sm ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                        {t.type === 'INCOME' ? '+' : '-'} {formatValue(Number(t.amount))}
                                    </Text>
                                </Pressable>
                            </View>
                        )}
                    />
                </View>
            )}

            <TransactionModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onSuccess={onRefresh}
            />

            <ImportModal
                visible={importModalVisible}
                onClose={() => setImportModalVisible(false)}
                onSuccess={onRefresh}
                accounts={accounts}
                categories={categories}
            />
        </View>
    );
}
