import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';

const CATEGORIES = [
    'Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Lazer',
    'Educação', 'Salário', 'Freelance', 'Investimentos', 'Outros'
];

interface TransactionModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialType?: 'INCOME' | 'EXPENSE';
}

export default function TransactionModal({ visible, onClose, onSuccess, initialType = 'EXPENSE' }: TransactionModalProps) {
    const [loading, setLoading] = useState(false);

    // Form State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>(initialType);
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date());
    const [isFixed, setIsFixed] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Reset form when modal opens or type changes
    useEffect(() => {
        if (visible) {
            setDescription('');
            setAmount('');
            setCategory('');
            setDate(new Date());
            setIsFixed(false);
            setType(initialType);
        }
    }, [visible, initialType]);

    const handleSave = async () => {
        const rawAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));

        if (!description || isNaN(rawAmount) || rawAmount <= 0) {
            Alert.alert('Atenção', 'Preencha descrição e valor corretamente.');
            return;
        }

        // If no category selected, try to infer or ask? For now strict.
        if (!category) {
            Alert.alert('Atenção', 'Selecione uma categoria.');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                description,
                amount: rawAmount,
                type,
                category,
                date: date.toISOString().split('T')[0],
                isFixed
            };

            await api.post('/transactions', payload);

            onSuccess();
            onClose();
            Alert.alert('Sucesso', 'Transação salva com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            Alert.alert('Erro', 'Não foi possível salvar a transação.');
        } finally {
            setLoading(false);
        }
    };

    const onChangeDate = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-slate-900/50">
                <View className="bg-white rounded-t-[32px] h-[90%] w-full">
                    <View className="px-6 py-5 border-b border-slate-100 flex-row justify-between items-center">
                        <View>
                            <Text className="text-xl font-bold text-slate-800">Novo Lançamento</Text>
                            <Text className="text-xs text-slate-500">Registre sua movimentação</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} className="p-2 bg-slate-50 rounded-full">
                            <MaterialIcons name="close" size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="p-6 space-y-5">
                        {/* Type Toggle */}
                        <View className="flex-row bg-slate-100 p-1.5 rounded-2xl">
                            <TouchableOpacity
                                onPress={() => setType('EXPENSE')}
                                className={`flex-1 py-3 items-center rounded-xl ${type === 'EXPENSE' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Text className={`text-xs font-black uppercase tracking-widest ${type === 'EXPENSE' ? 'text-rose-600' : 'text-slate-500'}`}>Despesa</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setType('INCOME')}
                                className={`flex-1 py-3 items-center rounded-xl ${type === 'INCOME' ? 'bg-white shadow-sm' : ''}`}
                            >
                                <Text className={`text-xs font-black uppercase tracking-widest ${type === 'INCOME' ? 'text-emerald-600' : 'text-slate-500'}`}>Receita</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="space-y-1">
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Ex: Aluguel, Salário..."
                                className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-medium text-slate-700 border border-transparent focus:border-indigo-500"
                            />
                        </View>

                        <View className="flex-row gap-4">
                            <View className="flex-1 space-y-1">
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</Text>
                                <TextInput
                                    value={amount}
                                    onChangeText={setAmount}
                                    keyboardType="numeric"
                                    placeholder="0,00"
                                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-black text-slate-800 border border-transparent focus:border-indigo-500"
                                />
                            </View>
                            <View className="flex-1 space-y-1">
                                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</Text>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-transparent"
                                >
                                    <Text className="font-medium text-slate-700">{date.toLocaleDateString()}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {showDatePicker && (
                            <DateTimePicker
                                testID="dateTimePicker"
                                value={date}
                                mode="date"
                                is24Hour={true}
                                display="default"
                                onChange={onChangeDate}
                            />
                        )}

                        <View className="space-y-1">
                            <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => setCategory(cat)}
                                        className={`px-4 py-3 rounded-xl border ${category === cat ? 'bg-indigo-600 border-indigo-600' : 'bg-slate-50 border-slate-50'}`}
                                    >
                                        <Text className={`font-bold text-xs ${category === cat ? 'text-white' : 'text-slate-600'}`}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity
                            onPress={() => setIsFixed(!isFixed)}
                            className="flex-row items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100"
                        >
                            <View className={`w-6 h-6 rounded-lg items-center justify-center border-2 ${isFixed ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
                                {isFixed && <MaterialIcons name="check" size={16} color="white" />}
                            </View>
                            <View>
                                <Text className="text-sm font-bold text-slate-700">Lançamento Fixo</Text>
                                <Text className="text-[10px] text-slate-400 font-medium">Repetir automaticamente todos os meses</Text>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>

                    <View className="p-6 border-t border-slate-100 bg-white pb-10">
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl items-center shadow-lg active:scale-[0.98] ${type === 'EXPENSE' ? 'bg-rose-500 shadow-rose-200' : 'bg-emerald-500 shadow-emerald-200'} ${loading ? 'opacity-70' : ''}`}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-black text-sm uppercase tracking-widest">
                                    Confirmar {type === 'EXPENSE' ? 'Despesa' : 'Receita'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
