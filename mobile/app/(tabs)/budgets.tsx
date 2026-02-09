import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useTransactions } from '../../hooks/useTransactions';

interface Budget {
    id: string;
    category: string;
    amount: number;
    spent: number;
    percentage: number;
    isOverBudget: boolean;
}

export default function BudgetsScreen() {
    const insets = useSafeAreaInsets();
    const { isPrivacyEnabled, togglePrivacy } = useTransactions();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form
    const [category, setCategory] = useState('');
    const [amount, setAmount] = useState('');

    const fetchBudgets = async () => {
        try {
            const response = await api.get('/budgets');
            setBudgets(response.data);
        } catch (error) {
            console.error('Erro ao buscar orçamentos:', error);
            Alert.alert('Erro', 'Não foi possível carregar os orçamentos.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

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
                        <TouchableOpacity
                            onPress={() => setModalVisible(true)}
                            className="bg-indigo-600 p-3 rounded-full shadow-lg shadow-indigo-200 active:scale-95"
                        >
                            <MaterialIcons name="add" size={24} color="white" />
                        </TouchableOpacity>
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
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2 bg-slate-100 rounded-full">
                                <MaterialIcons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View className="space-y-4 mb-6">
                            <View>
                                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Categoria</Text>
                                <TextInput
                                    value={category}
                                    onChangeText={setCategory}
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700"
                                    placeholder="Ex: Alimentação"
                                />
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

                        <TouchableOpacity
                            onPress={handleSave}
                            className="w-full bg-indigo-600 py-4 rounded-2xl items-center shadow-lg shadow-indigo-200 active:scale-95 mb-4"
                        >
                            <Text className="text-white font-bold text-lg">Salvar Orçamento</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Helper component for Header to avoid duplication
const LinkHeader = ({ title, subtitle, isPrivacyEnabled, togglePrivacy }: any) => (
    <View>
        <View className="flex-row items-center gap-3">
            <Text className="text-2xl font-bold text-slate-800">{title}</Text>
            <TouchableOpacity onPress={togglePrivacy} className="p-1 px-2 bg-slate-100 rounded-lg">
                <MaterialIcons name={isPrivacyEnabled ? "visibility-off" : "visibility"} size={16} color="#64748b" />
            </TouchableOpacity>
        </View>
        <Text className="text-slate-500 text-sm">{subtitle}</Text>
    </View>
);
