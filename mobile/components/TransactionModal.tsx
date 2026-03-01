import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Modal, Pressable, TextInput, ScrollView, Platform, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../services/api';
import { triggerHaptic } from '../utils/haptics';
import { Account, CreditCard } from '../types';
import { formatCurrency, parseCurrencyToNumber } from '../utils/currencyUtils';

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

interface TransactionModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialType?: 'INCOME' | 'EXPENSE';
    transactionToEdit?: any;
}

export default function TransactionModal({ visible, onClose, onSuccess, initialType = 'EXPENSE', transactionToEdit }: TransactionModalProps) {
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);

    // Form State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>(initialType as any);
    const [category, setCategory] = useState('');
    const [date, setDate] = useState(new Date());
    const [isFixed, setIsFixed] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [accountId, setAccountId] = useState('');
    const [destinationAccountId, setDestinationAccountId] = useState('');
    const [creditCardId, setCreditCardId] = useState('');
    const [isCategoryOpen, setIsCategoryOpen] = useState(false);

    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<any>(null);

    // Reset form when modal opens or type changes
    useEffect(() => {
        if (visible) {
            if (transactionToEdit) {
                setDescription(transactionToEdit.description || '');
                setAmount(formatCurrency(String(transactionToEdit.amount || 0)));
                setCategory(transactionToEdit.category?.name || transactionToEdit.categoryLegacy || '');
                setSelectedCategory(transactionToEdit.category || null);
                setDate(new Date(transactionToEdit.date));
                setIsFixed(transactionToEdit.isFixed || false);
                setType(transactionToEdit.type || initialType);
                setAccountId(transactionToEdit.accountId || '');
                setCreditCardId(transactionToEdit.creditCardId || '');
            } else {
                setDescription('');
                setAmount('');
                setCategory('');
                setSelectedCategory(null);
                setDate(new Date());
                setIsFixed(false);
                setType(initialType as any);
                setAccountId('');
                setDestinationAccountId('');
                setCreditCardId('');
            }
            setIsCategoryOpen(false);

            // Fetch data (keep as is to ensure dropdowns have latest info)
            Promise.all([
                api.get('/accounts'),
                api.get('/credit-cards'),
                api.get('/categories')
            ]).then(([accs, ccs, cats]) => {
                setAccounts(accs.data);
                setCreditCards(ccs.data);
                setCategories(cats.data);
            }).catch(console.error);
        }
    }, [visible, initialType, transactionToEdit]);

    // Reset category if type changes
    useEffect(() => {
        if (!visible) return;
        if (selectedCategory && selectedCategory.type !== type) {
            setCategory('');
            setSelectedCategory(null);
        }
    }, [type]);

    const groupedCategories = useMemo(() => {
        const groups: Record<string, any[]> = {
            'Entradas (Rendas)': [],
            'Necessidades (Essencial)': [],
            'Desejos (Estilo de Vida)': [],
            'Objetivos (Quitação e Reserva)': [],
            'Outras Despesas': []
        };

        categories.forEach(cat => {
            const groupName = getCategoryGroup(cat.name, cat.type);
            if (groups[groupName]) {
                groups[groupName].push(cat);
            }
        });

        // Filter groups by transaction type
        const filteredGroups = Object.entries(groups)
            .filter(([name, items]) => {
                if (items.length === 0) return false;
                if (type === 'INCOME') return name === 'Entradas (Rendas)';
                return name !== 'Entradas (Rendas)';
            })
            .map(([name, items]) => ({ name, items }));

        return filteredGroups;
    }, [categories, type]);

    const handleSave = async () => {
        const rawAmount = parseCurrencyToNumber(amount);

        if (!description || isNaN(rawAmount) || rawAmount <= 0) {
            Alert.alert('Atenção', 'Preencha descrição e valor corretamente.');
            return;
        }

        if (type === 'TRANSFER') {
            if (!accountId || !destinationAccountId) {
                Alert.alert('Atenção', 'Selecione a conta de origem e destino.');
                return;
            }
            if (accountId === destinationAccountId) {
                Alert.alert('Atenção', 'A conta de origem e destino devem ser diferentes.');
                return;
            }
        } else {
            if (!category) {
                Alert.alert('Atenção', 'Selecione uma categoria.');
                return;
            }
        }

        setLoading(true);
        try {
            if (type === 'TRANSFER') {
                const payload = {
                    description,
                    amount: rawAmount,
                    date: date.toISOString(),
                    sourceAccountId: accountId,
                    destinationAccountId
                };
                await api.post('/transactions/transfer', payload);
                Alert.alert('Sucesso', 'Transferência realizada com sucesso!');
            } else {
                const payload = {
                    description,
                    amount: rawAmount,
                    type,
                    categoryId: selectedCategory?.id,
                    categoryLegacy: category,
                    date: date.toISOString(),
                    isFixed,
                    accountId: accountId || undefined,
                    creditCardId: creditCardId || undefined
                };

                if (transactionToEdit) {
                    await api.patch(`/transactions/${transactionToEdit.id}`, payload);
                    Alert.alert('Sucesso', 'Transação atualizada com sucesso!');
                } else {
                    await api.post('/transactions', payload);
                    Alert.alert('Sucesso', 'Transação salva com sucesso!');
                }
            }

            triggerHaptic.success();
            onSuccess();
            onClose();
        } catch (error: any) {
            triggerHaptic.error();
            console.error('Erro ao salvar transação:');
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Data:', JSON.stringify(error.response.data, null, 2));
            } else {
                console.error('Message:', error.message);
            }
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
            <View style={styles.overlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>{transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</Text>
                            <Text style={styles.headerSubtitle}>{transactionToEdit ? 'Atualize os dados da movimentação' : 'Registre sua movimentação'}</Text>
                        </View>
                        <Pressable
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
                            android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: 24 }}
                            style={styles.closeButton}
                        >
                            <MaterialIcons name="close" size={24} color="#64748b" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        {/* Type Toggle */}
                        <View style={styles.toggleContainer}>
                            <Pressable
                                onPress={() => { setType('EXPENSE'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                style={[styles.toggleButton, type === 'EXPENSE' && styles.toggleButtonActive]}
                            >
                                <Text style={[styles.toggleText, type === 'EXPENSE' ? styles.textExpense : styles.textInactive]}>Despesa</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => { setType('INCOME'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                style={[styles.toggleButton, type === 'INCOME' && styles.toggleButtonActive]}
                            >
                                <Text style={[styles.toggleText, type === 'INCOME' ? styles.textIncome : styles.textInactive]}>Receita</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => { setType('TRANSFER'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                style={[styles.toggleButton, type === 'TRANSFER' && styles.toggleButtonActive]}
                            >
                                <Text style={[styles.toggleText, type === 'TRANSFER' ? styles.textTransfer : styles.textInactive]}>Transf.</Text>
                            </Pressable>
                        </View>

                        <View style={styles.inputSection}>
                            <Text style={styles.sectionLabel}>Descrição</Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder={type === 'TRANSFER' ? "Ex: Para a poupança..." : "Ex: Aluguel, Salário..."}
                                style={styles.input}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputSection, { flex: 1 }]}>
                                <Text style={styles.sectionLabel}>Valor (R$)</Text>
                                <TextInput
                                    value={amount}
                                    onChangeText={(text) => setAmount(formatCurrency(text))}
                                    keyboardType="numeric"
                                    placeholder="0,00"
                                    style={[styles.input, styles.amountInput]}
                                />
                            </View>
                            <View style={[styles.inputSection, { flex: 1 }]}>
                                <Text style={styles.sectionLabel}>Data</Text>
                                <View style={styles.datePickerWrapper}>
                                    <Pressable
                                        onPress={() => { setShowDatePicker(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                        android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                                        style={styles.datePickerButton}
                                    >
                                        <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                                    </Pressable>
                                </View>
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

                        {type !== 'TRANSFER' && (
                            <View style={styles.inputSection}>
                                <Text style={styles.sectionLabel}>Categoria</Text>
                                <Pressable
                                    onPress={() => { setIsCategoryOpen(!isCategoryOpen); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                    style={[styles.selectInput, isCategoryOpen && styles.selectInputActive]}
                                >
                                    <View style={styles.selectInputContent}>
                                        <View style={styles.selectInputLabelRow}>
                                            <MaterialIcons
                                                name="category"
                                                size={18}
                                                color={category ? '#4f46e5' : '#94a3b8'}
                                            />
                                            <Text style={[styles.selectInputText, !category && styles.selectInputPlaceholder]}>
                                                {category || 'Selecione uma categoria'}
                                            </Text>
                                        </View>
                                        <MaterialIcons
                                            name={isCategoryOpen ? "expand-less" : "expand-more"}
                                            size={24}
                                            color="#64748b"
                                        />
                                    </View>
                                </Pressable>

                                {isCategoryOpen && (
                                    <View style={styles.dropdownContainer}>
                                        <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                                            {groupedCategories.map(group => (
                                                <View key={group.name} style={styles.dropdownGroup}>
                                                    <Text style={styles.dropdownGroupLabel}>{group.name}</Text>
                                                    {group.items.map(cat => (
                                                        <Pressable
                                                            key={cat.id}
                                                            onPress={() => {
                                                                setCategory(cat.name);
                                                                setSelectedCategory(cat);
                                                                setIsCategoryOpen(false);
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            }}
                                                            style={[styles.dropdownItem, category === cat.name && styles.dropdownItemActive]}
                                                        >
                                                            <Text style={[styles.dropdownItemText, category === cat.name && styles.dropdownItemTextActive]}>
                                                                {cat.icon} {cat.name}
                                                            </Text>
                                                            {category === cat.name && <MaterialIcons name="check" size={18} color="#4f46e5" />}
                                                        </Pressable>
                                                    ))}
                                                </View>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.row}>
                            <View style={[styles.inputSection, { flex: 1 }]}>
                                <Text style={styles.sectionLabel}>{type === 'TRANSFER' ? 'Conta de Origem' : 'Conta Habitual'}</Text>

                                <View style={styles.selectWrapper}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                                        {accounts.map(acc => (
                                            <Pressable
                                                key={acc.id}
                                                onPress={() => { setAccountId(acc.id === accountId ? '' : acc.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                                style={[styles.smallChip, accountId === acc.id && styles.smallChipActive]}
                                            >
                                                <Text style={[styles.smallChipText, accountId === acc.id && styles.smallChipTextActive]}>{acc.name}</Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                </View>
                            </View>

                            {type === 'EXPENSE' && (
                                <View style={[styles.inputSection, { flex: 1 }]}>
                                    <Text style={styles.sectionLabel}>Cartão (Opcional)</Text>
                                    <View style={styles.selectWrapper}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                                            {creditCards.map(cc => (
                                                <Pressable
                                                    key={cc.id}
                                                    onPress={() => { setCreditCardId(cc.id === creditCardId ? '' : cc.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                                    style={[styles.smallChip, creditCardId === cc.id && styles.smallChipActivePurple]}
                                                >
                                                    <Text style={[styles.smallChipText, creditCardId === cc.id && styles.smallChipTextActive]}>{cc.name}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}

                            {type === 'TRANSFER' && (
                                <View style={[styles.inputSection, { flex: 1 }]}>
                                    <Text style={styles.sectionLabel}>Conta de Destino</Text>
                                    <View style={styles.selectWrapper}>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChips}>
                                            {accounts.map(acc => (
                                                <Pressable
                                                    key={acc.id}
                                                    onPress={() => { setDestinationAccountId(acc.id === destinationAccountId ? '' : acc.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                                    style={[styles.smallChip, destinationAccountId === acc.id && styles.smallChipActiveGreen]}
                                                >
                                                    <Text style={[styles.smallChipText, destinationAccountId === acc.id && styles.smallChipTextActive]}>{acc.name}</Text>
                                                </Pressable>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </View>
                            )}
                        </View>

                        <View style={styles.fixedToggleWrapper}>
                            <Pressable
                                onPress={() => { setIsFixed(!isFixed); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                                android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
                                style={styles.fixedToggle}
                            >
                                <View style={[styles.checkbox, isFixed && styles.checkboxActive]}>
                                    {isFixed && <MaterialIcons name="check" size={16} color="white" />}
                                </View>
                                <View>
                                    <Text style={styles.fixedTitle}>Lançamento Fixo</Text>
                                    <Text style={styles.fixedSubtitle}>Repetir automaticamente todos os meses</Text>
                                </View>
                            </Pressable>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <View style={[
                            styles.saveButtonContainer,
                            type === 'EXPENSE' ? styles.bgExpense : type === 'INCOME' ? styles.bgIncome : styles.bgTransfer,
                            loading && styles.loadingOpacity
                        ]}>
                            <Pressable
                                onPress={handleSave}
                                disabled={loading}
                                android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                                style={styles.saveButton}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.saveButtonText}>
                                        {transactionToEdit ? 'Salvar Alterações' :
                                            type === 'TRANSFER' ? 'Confirmar Transferência' :
                                                `Confirmar ${type === 'EXPENSE' ? 'Despesa' : 'Receita'}`}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '90%',
        width: '100%',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#64748b',
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 999,
    },
    scrollView: {
        padding: 24,
    },
    scrollContent: {
        gap: 20,
        paddingBottom: 40,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        padding: 6,
        borderRadius: 16,
    },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 12,
    },
    toggleButtonActive: {
        backgroundColor: 'white',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    toggleText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1.25,
    },
    textExpense: { color: '#e11d48' },
    textIncome: { color: '#059669' },
    textTransfer: { color: '#0284c7' },
    textInactive: { color: '#64748b' },
    inputSection: {
        gap: 4,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1.25,
        marginLeft: 4,
    },
    input: {
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        fontWeight: '500',
        color: '#334155',
        fontSize: 16,
    },
    amountInput: {
        fontWeight: '900',
        color: '#1e293b',
    },
    row: {
        flexDirection: 'row',
        gap: 16,
    },
    datePickerWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    datePickerButton: {
        width: '100%',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#f8fafc',
    },
    dateText: {
        fontWeight: '500',
        color: '#334155',
        fontSize: 16,
    },
    chipScroll: {
        flexDirection: 'row',
        gap: 8,
    },
    chipWrapper: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#f8fafc',
    },
    chipActive: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
    },
    chipActivePurple: {
        backgroundColor: '#9333ea',
        borderColor: '#9333ea',
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    chipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chipText: {
        fontWeight: 'bold',
        fontSize: 12,
        color: '#475569',
    },
    chipTextActive: {
        color: 'white',
    },
    fixedToggleWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
    },
    fixedToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        backgroundColor: 'white',
        borderColor: '#e2e8f0',
    },
    checkboxActive: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
    },
    fixedTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#334155',
    },
    fixedSubtitle: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    footer: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
        backgroundColor: 'white',
        paddingBottom: 40,
    },
    saveButtonContainer: {
        borderRadius: 16,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    bgExpense: {
        backgroundColor: '#f43f5e',
        shadowColor: '#fecdd3',
    },
    bgIncome: {
        backgroundColor: '#10b981',
        shadowColor: '#a7f3d0',
    },
    bgTransfer: {
        backgroundColor: '#0ea5e9',
        shadowColor: '#bae6fd',
    },
    saveButton: {
        width: '100%',
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1.25,
    },
    loadingOpacity: {
        opacity: 0.7,
    },
    verticalCategoryList: {
        gap: 16,
        marginTop: 8,
    },
    categoryGroup: {
        gap: 8,
    },
    groupLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: '#475569',
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    groupItems: {
        gap: 6,
    },
    categoryListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    categoryListItemActive: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
    },
    categoryListItemText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#334155',
    },
    categoryListItemTextActive: {
        color: 'white',
    },
    selectInput: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    selectInputActive: {
        borderColor: '#4f46e5',
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
    },
    selectInputContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectInputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectInputText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    selectInputPlaceholder: {
        color: '#94a3b8',
        fontWeight: '500',
    },
    dropdownContainer: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderTopWidth: 0,
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        maxHeight: 300,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    dropdownScroll: {
        padding: 8,
    },
    dropdownGroup: {
        marginBottom: 12,
    },
    dropdownGroupLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    dropdownItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
    },
    dropdownItemActive: {
        backgroundColor: '#f0f7ff',
    },
    dropdownItemText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#475569',
    },
    dropdownItemTextActive: {
        color: '#4f46e5',
        fontWeight: '700',
    },
    selectWrapper: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 8,
    },
    horizontalChips: {
        gap: 8,
    },
    smallChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'white',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    smallChipActive: {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
    },
    smallChipActivePurple: {
        backgroundColor: '#9333ea',
        borderColor: '#9333ea',
    },
    smallChipActiveGreen: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    smallChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748b',
    },
    smallChipTextActive: {
        color: 'white',
    },
});
