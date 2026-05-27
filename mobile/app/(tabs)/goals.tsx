import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, ActivityIndicator, Modal, TextInput, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useTransactions } from '../../hooks/useTransactions';
import { useCurrency } from '../../context/CurrencyContext';
import { useAuth } from '../../context/AuthContext';
import { openCheckout } from '../../services/paymentService';
import { parseCurrencyToNumber, formatCurrencyInput } from '../../utils/currencyUtils';
import { Goal } from '../../types';
import * as Haptics from 'expo-haptics';



export default function GoalsScreen() {
    const insets = useSafeAreaInsets();
    const { isPrivacyEnabled, togglePrivacy } = useTransactions();
    const { formatCurrency, currencySymbol } = useCurrency();
    const { user } = useAuth();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [depositModalVisible, setDepositModalVisible] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    // Form
    const [title, setTitle] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [depositAmount, setDepositAmount] = useState('');

    const isFree = user?.plan !== 'premium';
    const isGoalLimitReached = isFree && goals.length >= 3;

    const fetchGoals = async () => {
        try {
            const response = await api.get('/goals');
            setGoals(response.data);
        } catch (error) {
            console.error('Erro ao buscar metas:', error);
            Alert.alert('Erro', 'Não foi possível carregar as metas.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchGoals();
    }, []);

    const handleSave = async () => {
        if (isGoalLimitReached) {
            Alert.alert('Plano Gratuito', 'O plano Free permite apenas 3 metas. Faça upgrade para Premium para criar mais metas.', [
                { text: 'Entendi', style: 'cancel' },
                { text: 'Ver Premium', onPress: () => openCheckout() },
            ]);
            return;
        }

        if (!title || !targetAmount) {
            Alert.alert('Atenção', 'Preencha todos os campos.');
            return;
        }

        const rawAmount = parseCurrencyToNumber(targetAmount);
        if (isNaN(rawAmount) || rawAmount <= 0) {
            Alert.alert('Atenção', 'Valor inválido.');
            return;
        }

        try {
            if (editingGoal) {
                await api.patch(`/goals/${editingGoal.id}`, { title, targetAmount: rawAmount });
            } else {
                await api.post('/goals', { title, targetAmount: rawAmount });
            }
            setModalVisible(false);
            setEditingGoal(null);
            setTitle('');
            setTargetAmount('');
            fetchGoals();
            Alert.alert('Sucesso', 'Meta salva!');
        } catch (error) {
            console.error('Erro ao salvar meta:', error);
            Alert.alert('Erro', 'Não foi possível salvar a meta.');
        }
    };

    const openEditGoal = (goal: Goal) => {
        setEditingGoal(goal);
        setTitle(goal.title);
        setTargetAmount(formatCurrencyInput(String(Math.round(goal.targetAmount * 100)), currencySymbol));
        setModalVisible(true);
    };

    const handleDeleteGoal = (goal: Goal) => {
        Alert.alert(
            'Excluir Meta',
            `Deseja excluir a meta "${goal.title}"? Esta ação não pode ser desfeita.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/goals/${goal.id}`);
                            fetchGoals();
                            Alert.alert('Sucesso', 'Meta excluída!');
                        } catch (error) {
                            console.error('Erro ao excluir meta:', error);
                            Alert.alert('Erro', 'Não foi possível excluir a meta.');
                        }
                    }
                }
            ]
        );
    };

    const handleDeposit = async () => {
        if (!selectedGoal || !depositAmount) return;

        const rawAmount = parseCurrencyToNumber(depositAmount);
        if (isNaN(rawAmount) || rawAmount <= 0) {
            Alert.alert('Atenção', 'Valor inválido.');
            return;
        }

        try {
            await api.post(`/goals/${selectedGoal.id}/deposit`, { amount: rawAmount });
            setDepositModalVisible(false);
            setDepositAmount('');
            setSelectedGoal(null);
            fetchGoals();
            Alert.alert('Sucesso', 'Depósito realizado!');
        } catch (error) {
            console.error('Erro ao depositar:', error);
            Alert.alert('Erro', 'Não foi possível realizar o depósito.');
        }
    };

    const formatValue = (value: number | undefined | null) => {
        if (isPrivacyEnabled) return '••••';
        return formatCurrency(Number(value) || 0);
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
                            <LinkHeader title="Metas & Sonhos" subtitle="Realize seus objetivos" isPrivacyEnabled={isPrivacyEnabled} togglePrivacy={togglePrivacy} />
                        </View>
                        <View className="rounded-full overflow-hidden shadow-lg shadow-indigo-200">
                            <Pressable
                                onPress={() => {
                                    if (isGoalLimitReached) {
                                        Alert.alert(
                                            'Plano Gratuito',
                                            'O plano Free permite apenas 3 metas. Faça upgrade para Premium para criar mais metas.',
                                            [
                                                { text: 'Entendi', style: 'cancel' },
                                                { text: 'Ver Premium', onPress: () => openCheckout() },
                                            ]
                                        );
                                        return;
                                    }
                                    setModalVisible(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                }}
                                android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                                className="bg-indigo-600 p-3"
                            >
                                <MaterialIcons name={isGoalLimitReached ? 'lock' : 'add'} size={24} color="white" />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#4f46e5" className="mt-10" />
                ) : goals.length === 0 ? (
                    <View className="items-center justify-center py-20 px-6">
                        <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                            <MaterialIcons name="flag" size={32} color="#cbd5e1" />
                        </View>
                        <Text className="text-slate-900 font-bold text-lg mb-2">Nenhuma meta criada</Text>
                        <Text className="text-slate-500 text-center">Crie cofrinhos virtuais para seus sonhos.</Text>
                    </View>
                ) : (
                    <View className="px-4 space-y-4">
                        {isGoalLimitReached && (
                            <View className="px-4 mb-4">
                                <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex-row items-center gap-3">
                                    <MaterialIcons name="lock-outline" size={20} color="#f59e0b" />
                                    <View className="flex-1">
                                        <Text className="text-xs font-black text-amber-700 uppercase tracking-wider">Limite do plano Free</Text>
                                        <Text className="text-xs font-medium text-amber-600 mt-1">Você já usa as 3 metas incluídas no Free. Para criar mais, faça upgrade.</Text>
                                    </View>
                                    <Pressable onPress={() => openCheckout()} className="bg-amber-500 px-3 py-2 rounded-xl">
                                        <Text className="text-white text-xs font-black uppercase">Upgrade</Text>
                                    </Pressable>
                                </View>
                            </View>
                        )}
                        {goals.map(goal => (
                            <View key={goal.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                {isGoalLimitReached && (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                                        <MaterialIcons name="lock-outline" size={14} color="#f59e0b" />
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Somente leitura</Text>
                                    </View>
                                )}
                                <View className="flex-row justify-between items-start mb-3">
                                    <View>
                                        <Text className="text-lg font-bold text-slate-700">{goal.title}</Text>
                                        <Text className="text-xs text-slate-400 font-bold uppercase mt-1">
                                            Meta: {formatValue(goal.targetAmount)}
                                        </Text>
                                    </View>
                                    <View className="rounded-lg overflow-hidden border border-emerald-100 bg-emerald-50">
                                        <Pressable
                                            onPress={() => {
                                                if (isGoalLimitReached) {
                                                    Alert.alert('Plano Gratuito', 'Depósito disponível apenas no plano Premium.', [{ text: 'Entendi' }, { text: 'Ver Premium', onPress: () => openCheckout() }]);
                                                    return;
                                                }
                                                setSelectedGoal(goal);
                                                setDepositModalVisible(true);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            android_ripple={{ color: 'rgba(16,185,129,0.2)' }}
                                            className={`px-3 py-1.5 ${isGoalLimitReached ? 'opacity-50' : ''}`}
                                        >
                                            <Text className="text-emerald-700 font-bold text-xs">+ Depositar</Text>
                                        </Pressable>
                                    </View>
                                </View>

                                {(() => {
                                    const current = Number(goal.currentAmount) || 0;
                                    const target = Number(goal.targetAmount) || 1;
                                    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                                    return (
                                        <View className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-3 relative">
                                            <View
                                                className="h-full bg-indigo-500 absolute left-0 top-0 bottom-0 z-10"
                                                style={{ width: `${progress}%` }}
                                            />
                                            <Text className="absolute w-full text-center text-xs font-bold text-slate-500 z-20 top-[1px]">
                                                {progress.toFixed(1)}%
                                            </Text>
                                        </View>
                                    );
                                })()}

                                <View className="flex-row justify-between items-center">
                                    <Text className="text-2xl font-black text-slate-800">
                                        {formatValue(goal.currentAmount)}
                                    </Text>
                                    <Text className="text-xs font-bold text-slate-400">
                                        Faltam {formatValue((Number(goal.targetAmount) || 0) - (Number(goal.currentAmount) || 0))}
                                    </Text>
                                </View>

                                <View className="flex-row justify-between mt-3 pt-3 border-t border-slate-100">
                                    <Pressable
                                        onPress={() => {
                                            if (isGoalLimitReached) {
                                                Alert.alert('Plano Gratuito', 'Edição disponível apenas no plano Premium.', [{ text: 'Entendi' }, { text: 'Ver Premium', onPress: () => openCheckout() }]);
                                                return;
                                            }
                                            openEditGoal(goal);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-indigo-50 mr-2 ${isGoalLimitReached ? 'opacity-50' : ''}`}
                                    >
                                        <MaterialIcons name="edit" size={18} color="#4f46e5" />
                                        <Text className="text-indigo-600 font-bold text-xs ml-2">Editar</Text>
                                    </Pressable>
                                    <Pressable
                                        onPress={() => {
                                            if (isGoalLimitReached) {
                                                Alert.alert('Plano Gratuito', 'Exclusão disponível apenas no plano Premium.', [{ text: 'Entendi' }, { text: 'Ver Premium', onPress: () => openCheckout() }]);
                                                return;
                                            }
                                            handleDeleteGoal(goal);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }}
                                        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-xl bg-rose-50 ${isGoalLimitReached ? 'opacity-50' : ''}`}
                                    >
                                        <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                                        <Text className="text-rose-600 font-bold text-xs ml-2">Excluir</Text>
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* CREATE GOAL MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 justify-end bg-slate-900/50">
                    <View className="bg-white rounded-t-3xl p-6">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-xl font-bold text-slate-800">{editingGoal ? 'Editar Meta' : 'Nova Meta'}</Text>
                            <View className="rounded-full overflow-hidden bg-slate-100">
                                <Pressable
                                    onPress={() => {
                                        setModalVisible(false);
                                        setEditingGoal(null);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    className="p-2"
                                    android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                                >
                                    <MaterialIcons name="close" size={20} color="#64748b" />
                                </Pressable>
                            </View>
                        </View>

                        <View className="space-y-4 mb-6">
                            <View>
                                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Nome do Objetivo</Text>
                                <TextInput
                                    value={title}
                                    onChangeText={setTitle}
                                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700"
                                    placeholder="Ex: Viagem para Disney"
                                />
                            </View>
                            <View>
                                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Valor Alvo ({currencySymbol})</Text>
                                <TextInput
                                    value={targetAmount}
                                    onChangeText={setTargetAmount}
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
                                <Text className="text-white font-bold text-lg">{editingGoal ? 'Atualizar Meta' : 'Criar Meta'}</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* DEPOSIT MODAL */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={depositModalVisible}
                onRequestClose={() => setDepositModalVisible(false)}
            >
                <View className="flex-1 justify-center items-center bg-slate-900/50 px-4">
                    <View className="bg-white rounded-3xl p-6 w-full max-w-sm">
                        <View className="flex-row justify-between items-center mb-6">
                            <View>
                                <Text className="text-lg font-bold text-slate-800">Novo Aporte</Text>
                                <Text className="text-xs text-slate-500">{selectedGoal?.title}</Text>
                            </View>
                            <View className="rounded-full overflow-hidden bg-slate-100">
                                <Pressable
                                    onPress={() => { setDepositModalVisible(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                    className="p-2"
                                    android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                                >
                                    <MaterialIcons name="close" size={20} color="#64748b" />
                                </Pressable>
                            </View>
                        </View>

                        <View className="mb-6">
                            <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Valor do Depósito ({currencySymbol})</Text>
                            <TextInput
                                value={depositAmount}
                                onChangeText={setDepositAmount}
                                keyboardType="numeric"
                                className="w-full p-4 bg-emerald-50 rounded-2xl font-black text-emerald-700 text-xl text-center border border-emerald-100 placeholder:text-emerald-300"
                                placeholder="0,00"
                                autoFocus
                            />
                        </View>

                        <View className="rounded-2xl overflow-hidden shadow-lg shadow-emerald-200">
                            <Pressable
                                onPress={() => { handleDeposit(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                                android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                                className="w-full bg-emerald-500 py-4 items-center"
                            >
                                <Text className="text-white font-bold text-lg">Confirmar Depósito</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Helper component
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
