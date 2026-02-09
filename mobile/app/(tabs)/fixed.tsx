import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { useFixedTransactions } from '../../hooks/useFixedTransactions';
import api from '../../services/api';

export default function FixedScreen() {
    const insets = useSafeAreaInsets();
    const { transactions, loading, refreshing, onRefresh, setTransactions, isPrivacyEnabled, togglePrivacy } = useTransactions();

    // Dummy totals for the hook
    const totals = useMemo(() => ({ income: 0, expense: 0, balance: 0, currentIncome: 0, currentExpense: 0 }), []);
    const { fixedItems } = useFixedTransactions(transactions, totals);

    const handleDelete = (id: string) => {
        Alert.alert(
            'Parar de Repetir',
            'Deseja remover este item dos fixos? (Lançamentos passados não serão apagados)',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Confirmar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Usually we PATCH to set isFixed = false
                            await api.patch(`/transactions/${id}`, { isFixed: false });
                            setTransactions(prev => prev.map(t => t.id === id ? { ...t, isFixed: false } : t));
                            Alert.alert('Sucesso', 'Removido dos fixos.');
                        } catch (error) {
                            Alert.alert('Erro', 'Falha ao atualizar.');
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
            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                <View className="bg-white p-6 pt-12 rounded-b-3xl shadow-sm mb-6" style={{ paddingTop: insets.top + 20 }}>
                    <View>
                        <View className="flex-row items-center gap-3">
                            <Text className="text-2xl font-bold text-slate-800">Controle de Fixos</Text>
                            <TouchableOpacity onPress={togglePrivacy} className="p-1 px-2 bg-slate-100 rounded-lg">
                                <MaterialIcons name={isPrivacyEnabled ? "visibility-off" : "visibility"} size={16} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-slate-500 text-sm">Gerencie suas contas recorrentes</Text>
                    </View>
                </View>

                {loading ? (
                    <View className="py-10 items-center">
                        <Text className="text-slate-400">Carregando...</Text>
                    </View>
                ) : fixedItems.length === 0 ? (
                    <View className="items-center justify-center py-20 px-6">
                        <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
                            <MaterialIcons name="event-repeat" size={32} color="#cbd5e1" />
                        </View>
                        <Text className="text-slate-900 font-bold text-lg mb-2">Nenhum fixo encontrado</Text>
                        <Text className="text-slate-500 text-center">Marque "Lançamento Fixo" ao criar uma transação para vê-la aqui.</Text>
                    </View>
                ) : (
                    <View className="px-4 space-y-4">
                        {fixedItems.map(item => (
                            <View key={item.lastTransactionId} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex-row justify-between items-center">
                                <View className="flex-row items-center gap-4">
                                    <View className={`w-12 h-12 rounded-xl items-center justify-center ${item.type === 'INCOME' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                                        <MaterialIcons
                                            name={item.type === 'INCOME' ? 'arrow-upward' : 'arrow-downward'}
                                            size={24}
                                            color={item.type === 'INCOME' ? '#10b981' : '#f43f5e'}
                                        />
                                    </View>
                                    <View>
                                        <Text className="font-bold text-slate-700 text-base">{item.name}</Text>
                                        <View className="flex-row items-center gap-2">
                                            <Text className="text-xs text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">{item.category}</Text>
                                            {item.day && <Text className="text-xs text-slate-400">Todo dia {item.day}</Text>}
                                        </View>
                                    </View>
                                </View>

                                <View className="items-end gap-2">
                                    <Text className={`font-black text-base ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-700'}`}>
                                        {formatValue(item.amount)}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => handleDelete(item.lastTransactionId)}
                                        className="p-1 bg-red-50 rounded-lg"
                                    >
                                        <MaterialIcons name="delete" size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}
