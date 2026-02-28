import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator, Modal, TextInput, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useTransactions } from '../../hooks/useTransactions';
import * as Haptics from 'expo-haptics';

interface Budget {
    id: string;
    category: string;
    amount: number;
    spent: number;
    percentage: number;
    isOverBudget: boolean;
}

const getCategoryGroup = (name: string, type: 'INCOME' | 'EXPENSE') => {
    if (type === 'INCOME') return 'Entradas (Rendas)';

    const needs = ['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais'];
    const desires = ['Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Viagens'];
    const goals = ['Aplicações / Poupança', 'Pagamento de Dívidas'];

    if (needs.includes(name)) return 'Necessidades (Essencial)';
    if (desires.includes(name)) return 'Desejos (Estilo de Vida)';
    if (goals.includes(name)) return 'Objetivos (Quitação e Reserva)';

    return 'Outras Despesas';
};

export default function BudgetsScreen() {
    const insets = useSafeAreaInsets();
    const { isPrivacyEnabled, togglePrivacy } = useTransactions();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form
    const [category, setCategory] = useState('');
    const [selectedCat, setSelectedCat] = useState<any>(null);
    const [amount, setAmount] = useState('');
    const [categories, setCategories] = useState<any[]>([]);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

    const fetchBudgets = async () => {
        try {
            const [bRes, cRes] = await Promise.all([
                api.get('/budgets'),
                api.get('/categories')
            ]);
            setBudgets(bRes.data);
            setCategories(cRes.data);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            Alert.alert('Erro', 'Não foi possível carregar os dados.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const groupedCategories = React.useMemo(() => {
        const groups: Record<string, any[]> = {
            'Entradas (Rendas)': [],
            'Necessidades (Essencial)': [],
            'Desejos (Estilo de Vida)': [],
            'Objetivos (Quitação e Reserva)': [],
            'Outras Despesas': []
        };

        categories.forEach(cat => {
            const groupName = getCategoryGroup(cat.name, cat.type as any);
            if (groups[groupName]) {
                groups[groupName].push(cat);
            }
        });

        return Object.entries(groups)
            .filter(([_, items]) => items.length > 0)
            .map(([name, items]) => ({ name, items }));
    }, [categories]);

    useEffect(() => {
        fetchBudgets();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBudgets();
    }, []);

    const handleSave = async () => {
        if (!category || !amount) {
            Alert.alert('Atenção', 'Preencha todos os campos.');
            return;
        }

        const rawAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        if (isNaN(rawAmount) || rawAmount <= 0) {
            Alert.alert('Atenção', 'Valor inválido.');
            return;
        }

        try {
            await api.post('/budgets', { category, amount: rawAmount });
            setModalVisible(false);
            setCategory('');
            setAmount('');
            fetchBudgets();
            Alert.alert('Sucesso', 'Orçamento salvo!');
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
            Alert.alert('Erro', 'Não foi possível salvar o orçamento.');
        }
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-rose-500';
        if (percentage >= 80) return 'bg-amber-400';
        return 'bg-emerald-500';
    };

    const formatValue = (value: number | undefined | null) => {
        if (isPrivacyEnabled) return '••••';
        const safeValue = Number(value) || 0;
        return `R$ ${safeValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    };

    return (
        <View className="flex-1 bg-slate-50">
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="bg-white p-6 pt-12 rounded-b-3xl shadow-sm mb-6" style={{ paddingTop: insets.top + 20 }}>
                    <View className="flex-row justify-between items-center">
                        <View>
                            <LinkHeader title="Orçamentos" subtitle="Controle seus gastos mensais" isPrivacyEnabled={isPrivacyEnabled} togglePrivacy={togglePrivacy} />
                        </View>
                        <View className="rounded-full overflow-hidden shadow-lg shadow-indigo-200">
                            <Pressable
                                onPress={() => { setModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                                android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                                className="bg-indigo-600 p-3"
                            >
                                <MaterialIcons name="add" size={24} color="white" />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#4f46e5" className="mt-10" />
                ) : budgets.length === 0 ? (
                    <View className="items-center justify-center py-20 px-6">
                        <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                            <MaterialIcons name="savings" size={32} color="#cbd5e1" />
                        </View>
                        <Text className="text-slate-900 font-bold text-lg mb-2">Nenhum orçamento</Text>
                        <Text className="text-slate-500 text-center">Defina tetos de gastos para suas categorias.</Text>
                    </View>
                ) : (
                    <View className="px-4 space-y-4">
                        {budgets.map(budget => (
                            <View key={budget.category} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <View className="flex-row justify-between items-start mb-3">
                                    <View>
                                        <Text className="text-lg font-bold text-slate-700">{budget.category}</Text>
                                        <Text className="text-xs text-slate-400 font-bold uppercase mt-1">
                                            Gasto: {formatValue(budget.spent)}
                                        </Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-xs text-slate-400 font-bold uppercase">Teto</Text>
                                        <Text className="text-lg font-black text-indigo-600">
                                            {formatValue(budget.amount)}
                                        </Text>
                                    </View>
                                </View>

                                <View className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                                    <View
                                        className={`h-full ${getProgressColor(budget.percentage)}`}
                                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                    />
                                </View>

                                <View className="flex-row justify-between">
                                    <Text className={`text-xs font-bold ${budget.isOverBudget ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {budget.isOverBudget ? 'Orçamento Estourado!' : 'Dentro do limite'}
                                    </Text>
                                    <Text className="text-xs font-bold text-slate-400">
                                        {budget.percentage.toFixed(1)}% usado
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-slate-900/50">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-slate-800">Novo Orçamento</Text>
                            <View className="rounded-full overflow-hidden bg-slate-100">
                                <Pressable
                                    onPress={() => { setModalVisible(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                    className="p-2"
                                    android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                                >
                                    <MaterialIcons name="close" size={20} color="#64748b" />
                                </Pressable>
                            </View>
                        </View>

                        <View className="space-y-4 mb-6">
                            <View>
                                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Categoria</Text>
                                <Pressable
                                    onPress={() => setIsCategoryPickerOpen(true)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl flex-row justify-between items-center"
                                >
                                    <Text className={`font-bold ${category ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {category || 'Selecione uma categoria'}
                                    </Text>
                                    <MaterialIcons name="keyboard-arrow-down" size={20} color="#64748b" />
                                </Pressable>
                            </View>
                            <View>
                                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Teto Mensal (R$)</Text>
                                <TextInput
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700"
                                    placeholder="0,00"
                                />
                            </View>
                        </View>

                        <View className="rounded-2xl overflow-hidden shadow-lg shadow-indigo-200 mb-4">
                            <Pressable
                                onPress={() => { handleSave(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                                android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                                className="w-full bg-indigo-600 py-4 items-center"
                            >
                                <Text className="text-white font-bold text-lg">Salvar Orçamento</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Category Picker Overlay */}
                <Modal visible={isCategoryPickerOpen} transparent animationType="fade">
                    <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', padding: 24 }}>
                        <View style={{ backgroundColor: 'white', borderRadius: 32, padding: 16, maxHeight: '80%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 8 }}>
                                <Text style={{ fontSize: 18, fontWeight: '900', color: '#1e293b' }}>Escolher Categoria</Text>
                                <Pressable onPress={() => setIsCategoryPickerOpen(false)} style={{ padding: 4 }}>
                                    <MaterialIcons name="close" size={24} color="#94a3b8" />
                                </Pressable>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {groupedCategories.map(group => (
                                    <View key={group.name} style={{ marginBottom: 20 }}>
                                        <Text style={{ fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, paddingHorizontal: 8 }}>{group.name}</Text>
                                        <View style={{ gap: 8 }}>
                                            {group.items.map(cat => (
                                                <Pressable
                                                    key={cat.id}
                                                    onPress={() => {
                                                        setCategory(cat.name);
                                                        setSelectedCat(cat);
                                                        setIsCategoryPickerOpen(false);
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    }}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        padding: 16,
                                                        backgroundColor: category === cat.name ? '#f1f5f9' : 'transparent',
                                                        borderRadius: 16,
                                                        borderWidth: 1,
                                                        borderColor: category === cat.name ? '#e2e8f0' : 'transparent'
                                                    }}
                                                >
                                                    <Text style={{ fontSize: 18, marginRight: 12 }}>{cat.icon}</Text>
                                                    <Text style={{ fontSize: 16, fontWeight: '700', color: category === cat.name ? '#4f46e5' : '#475569', flex: 1 }}>{cat.name}</Text>
                                                    {category === cat.name && <MaterialIcons name="check" size={20} color="#4f46e5" />}
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </Modal>
        </View>
    );
}

// Helper component for Header to avoid duplication
const LinkHeader = ({ title, subtitle, isPrivacyEnabled, togglePrivacy }: any) => (
    <View>
        <View className="flex-row items-center gap-3">
            <Text className="text-2xl font-bold text-slate-800">{title}</Text>
            <View className="rounded-lg overflow-hidden bg-slate-100">
                <Pressable
                    onPress={() => { togglePrivacy(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                    className="p-1 px-2"
                >
                    <MaterialIcons name={isPrivacyEnabled ? "visibility-off" : "visibility"} size={16} color="#64748b" />
                </Pressable>
            </View>
        </View>
        <Text className="text-slate-500 text-sm">{subtitle}</Text>
    </View>
);
