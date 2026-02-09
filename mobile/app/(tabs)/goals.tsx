import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { useTransactions } from '../../hooks/useTransactions';

interface Goal {
    id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    progress: number;
    remainingAmount: number;
}

export default function GoalsScreen() {
    const insets = useSafeAreaInsets();
    const { isPrivacyEnabled, togglePrivacy } = useTransactions();
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [depositModalVisible, setDepositModalVisible] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

    // Form
    const [title, setTitle] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [depositAmount, setDepositAmount] = useState('');

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
        if (!title || !targetAmount) {
            Alert.alert('Atenção', 'Preencha todos os campos.');
            return;
        }

        const rawAmount = parseFloat(targetAmount.replace(/\./g, '').replace(',', '.'));
        if (isNaN(rawAmount) || rawAmount <= 0) {
            Alert.alert('Atenção', 'Valor inválido.');
            return;
        }

        try {
            await api.post('/goals', { title, targetAmount: rawAmount });
            setModalVisible(false);
            setTitle('');
            setTargetAmount('');
            fetchGoals();
            Alert.alert('Sucesso', 'Meta criada!');
        } catch (error) {
            console.error('Erro ao salvar meta:', error);
            Alert.alert('Erro', 'Não foi possível salvar a meta.');
        }
    };

    const handleDeposit = async () => {
        if (!selectedGoal || !depositAmount) return;

        const rawAmount = parseFloat(depositAmount.replace(/\./g, '').replace(',', '.'));
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
                            <LinkHeader title="Metas & Sonhos" subtitle="Realize seus objetivos" isPrivacyEnabled={isPrivacyEnabled} togglePrivacy={togglePrivacy} />
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
                        {goals.map(goal => (
                            <View key={goal.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                <View className="flex-row justify-between items-start mb-3">
                                    <View>
                                        <Text className="text-lg font-bold text-slate-700">{goal.title}</Text>
                                        <Text className="text-xs text-slate-400 font-bold uppercase mt-1">
                                            Meta: {formatValue(goal.targetAmount)}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setSelectedGoal(goal);
                                            setDepositModalVisible(true);
                                        }}
                                        className="bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 active:scale-95"
                                    >
                                        <Text className="text-emerald-700 font-bold text-xs">+ Depositar</Text>
                                    </TouchableOpacity>
                                </View>

                                <View className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-3 relative">
                                    <View
                                        className="h-full bg-indigo-500 absolute left-0 top-0 bottom-0 z-10"
                                        style={{ width: `${Math.min(goal.progress || 0, 100)}%` }}
                                    />
                                    <Text className="absolute w-full text-center text-[10px] font-bold text-slate-500 z-20 top-[1px]">
                                        {(Number(goal.progress) || 0).toFixed(1)}%
                                    </Text>
                                </View>

                                <View className="flex-row justify-between items-center">
                                    <Text className="text-2xl font-black text-slate-800">
                                        {formatValue(goal.currentAmount)}
                                    </Text>
                                    <Text className="text-xs font-bold text-slate-400">
                                        Faltam {formatValue(goal.remainingAmount)}
                                    </Text>
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
                            <Text className="text-xl font-bold text-slate-800">Nova Meta</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} className="p-2 bg-slate-100 rounded-full">
                                <MaterialIcons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
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
                                <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Valor Alvo (R$)</Text>
                                <TextInput
                                    value={targetAmount}
                                    onChangeText={setTargetAmount}
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
                            <Text className="text-white font-bold text-lg">Criar Meta</Text>
                        </TouchableOpacity>
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
                            <TouchableOpacity onPress={() => setDepositModalVisible(false)} className="p-2 bg-slate-100 rounded-full">
                                <MaterialIcons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View className="mb-6">
                            <Text className="text-xs font-bold text-slate-500 uppercase mb-2">Valor do Depósito (R$)</Text>
                            <TextInput
                                value={depositAmount}
                                onChangeText={setDepositAmount}
                                keyboardType="numeric"
                                className="w-full p-4 bg-emerald-50 rounded-2xl font-black text-emerald-700 text-xl text-center border border-emerald-100 placeholder:text-emerald-300"
                                placeholder="0,00"
                                autoFocus
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleDeposit}
                            className="w-full bg-emerald-500 py-4 rounded-2xl items-center shadow-lg shadow-emerald-200 active:scale-95"
                        >
                            <Text className="text-white font-bold text-lg">Confirmar Depósito</Text>
                        </TouchableOpacity>
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
            <TouchableOpacity onPress={togglePrivacy} className="p-1 px-2 bg-slate-100 rounded-lg">
                <MaterialIcons name={isPrivacyEnabled ? "visibility-off" : "visibility"} size={16} color="#64748b" />
            </TouchableOpacity>
        </View>
        <Text className="text-slate-500 text-sm">{subtitle}</Text>
    </View>
);
