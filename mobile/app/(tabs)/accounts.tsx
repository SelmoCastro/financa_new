import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, RefreshControl, Alert,
    Pressable, Modal, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import api from '../../services/api';
import { parseCurrencyToNumber, formatCurrencyInput } from '../../utils/currencyUtils';
import { Account, CreditCard } from '../../types';
import { BankIcon } from '../../components/BankIcon';
import { useCurrency } from '../../context/CurrencyContext';

const BANKS = [
    'Nubank', 'Itaú', 'Bradesco', 'Banco do Brasil', 'Santander',
    'Caixa Econômica', 'Inter', 'C6 Bank', 'Sicredi', 'BTG Pactual',
    'XP Investimentos', 'PicPay', 'Mercado Pago', 'Carteira (Físico)', 'Outros'
];

const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH', 'OTHER'];
const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    CHECKING: 'Conta Corrente',
    SAVINGS: 'Poupança',
    INVESTMENT: 'Investimentos',
    CASH: 'Dinheiro',
    OTHER: 'Outro',
};

export default function AccountsScreen() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [loading, setLoading] = useState(true);
    const { formatCurrency, currency } = useCurrency();

    // Criação
    const [createModal, setCreateModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState(BANKS[0]);
    const [type, setType] = useState('CHECKING');
    const [balance, setBalance] = useState('0,00');

    // Edição
    const [editModal, setEditModal] = useState(false);
    const [editAccount, setEditAccount] = useState<Account | null>(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState('CHECKING');
    const [editBalance, setEditBalance] = useState('0,00');

    // Cartão de Crédito
    const [ccModal, setCcModal] = useState(false);
    const [editCc, setEditCc] = useState<CreditCard | null>(null);
    const [ccName, setCcName] = useState('');
    const [ccLimit, setCcLimit] = useState('');
    const [ccClosingDay, setCcClosingDay] = useState('');
    const [ccDueDay, setCcDueDay] = useState('');
    const [ccAccountId, setCcAccountId] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [accRes, ccRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/credit-cards')
            ]);
            setAccounts(accRes.data);
            setCreditCards(ccRes.data);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            Alert.alert('Erro', 'Não foi possível carregar as contas e cartões.');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

    // ---- CRIAR ----
    const openCreate = () => {
        setName(BANKS[0]); setType('CHECKING'); setBalance('0,00');
        setCreateModal(true);
    };

    const handleCreate = async () => {
        if (!name.trim()) { Alert.alert('Atenção', 'Informe o nome da conta.'); return; }
        setSaving(true);
        try {
            await api.post('/accounts', { name: name.trim(), type, balance: parseCurrencyToNumber(balance) });
            setCreateModal(false);
            await fetchData();
        } catch {
            Alert.alert('Erro', 'Não foi possível criar a conta.');
        } finally { setSaving(false); }
    };

    // ---- EDITAR ----
    const openEdit = (acc: Account) => {
        setEditAccount(acc);
        setEditName(acc.name);
        setEditType(acc.type);
        setEditBalance(formatCurrencyInput(String(Math.round(Number(acc.balance) * 100)), currency));
        setEditModal(true);
    };

    const handleEdit = async () => {
        if (!editName.trim() || !editAccount) return;
        setSaving(true);
        try {
            await api.patch(`/accounts/${editAccount.id}`, {
                name: editName.trim(),
                type: editType,
                balance: parseCurrencyToNumber(editBalance),
            });
            setEditModal(false);
            await fetchData();
        } catch {
            Alert.alert('Erro', 'Não foi possível atualizar a conta.');
        } finally { setSaving(false); }
    };

    // ---- EXCLUIR ----
    const handleDelete = (acc: Account) => {
        Alert.alert(
            'Excluir Conta',
            `Deseja excluir a conta "${acc.name}"? Esta ação não pode ser desfeita.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir', style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/accounts/${acc.id}`);
                            await fetchData();
                        } catch {
                            Alert.alert('Erro', 'Não foi possível excluir a conta.');
                        }
                    }
                }
            ]
        );
    };

    // ---- CARTÕES DE CRÉDITO ----
    const openCreateCc = () => {
        setEditCc(null);
        setCcName(''); setCcLimit(''); setCcClosingDay(''); setCcDueDay(''); setCcAccountId('');
        setCcModal(true);
    };

    const openEditCc = (card: CreditCard) => {
        setEditCc(card);
        setCcName(card.name);
        setCcLimit(String(card.limit));
        setCcClosingDay(String(card.closingDay));
        setCcDueDay(String(card.dueDay));
        setCcAccountId(card.accountId || '');
        setCcModal(true);
    };

    const handleSaveCc = async () => {
        if (!ccName.trim() || !ccLimit || !ccClosingDay || !ccDueDay) {
            Alert.alert('Atenção', 'Preencha todos os campos do cartão.');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: ccName.trim(),
                limit: Number(ccLimit.replace(',', '.')),
                closingDay: Number(ccClosingDay),
                dueDay: Number(ccDueDay),
                accountId: ccAccountId || null
            };

            if (editCc) {
                await api.patch(`/credit-cards/${editCc.id}`, payload);
            } else {
                await api.post('/credit-cards', payload);
            }
            setCcModal(false);
            await fetchData();
        } catch {
            Alert.alert('Erro', 'Não foi possível salvar o cartão.');
        } finally { setSaving(false); }
    };

    const handleDeleteCc = (card: CreditCard) => {
        Alert.alert(
            'Excluir Cartão',
            `Deseja excluir o cartão "${card.name}"? Esta ação não pode ser desfeita.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir', style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/credit-cards/${card.id}`);
                            await fetchData();
                        } catch {
                            Alert.alert('Erro', 'Não foi possível excluir o cartão.');
                        }
                    }
                }
            ]
        );
    };

    const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

    return (
        <>
            <ScrollView
                className="flex-1 bg-slate-50"
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
            >
                {/* Header */}
                <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
                    <View>
                        <Text className="text-2xl font-black text-slate-800">Contas e Cartões</Text>
                        <Text className="text-sm text-slate-500 font-medium mt-1">Gerencie seu saldo e faturas</Text>
                    </View>
                    <Pressable onPress={openCreate} style={styles.addButton} android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true }}>
                        <MaterialIcons name="add" size={24} color="white" />
                    </Pressable>
                </View>

                {/* Saldo Consolidado */}
                <View className="px-6 mb-6">
                    <View className="bg-indigo-600 rounded-[24px] p-6">
                        <View className="flex-row items-center gap-2 mb-4 opacity-90">
                            <MaterialIcons name="account-balance-wallet" size={20} color="white" />
                            <Text className="text-indigo-100 font-medium text-sm">Saldo Consolidado</Text>
                        </View>
                        <Text className="text-white text-4xl font-black">
                            {formatCurrency(totalBalance)}
                        </Text>
                    </View>
                </View>

                {/* Contas */}
                <View className="px-6 mb-8">
                    <Text className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Suas Contas</Text>
                    {accounts.length === 0 && !loading && (
                        <Pressable onPress={openCreate} style={styles.emptyCard}>
                            <MaterialIcons name="add-circle-outline" size={32} color="#a5b4fc" />
                            <Text style={styles.emptyText}>Nenhuma conta. Toque para adicionar.</Text>
                        </Pressable>
                    )}
                    {accounts.map(acc => (
                        <View key={acc.id} className="bg-white p-5 rounded-2xl mb-3 border border-slate-100 shadow-sm">
                            <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center gap-4 flex-1">
                                    <BankIcon name={acc.name} type={acc.type} size={48} />
                                    <View className="flex-1">
                                        <Text className="text-base font-bold text-slate-800">{acc.name}</Text>
                                        <Text className="text-xs font-medium text-slate-400">{ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}</Text>
                                    </View>
                                </View>
                                <Text className="text-base font-black text-slate-800 mr-4">
                                    {formatCurrency(acc.balance)}
                                </Text>
                            </View>
                            {/* Ações */}
                            <View style={styles.actionRow}>
                                <Pressable onPress={() => openEdit(acc)} style={styles.btnEdit} android_ripple={{ color: '#e0e7ff' }}>
                                    <MaterialIcons name="edit" size={16} color="#4f46e5" />
                                    <Text style={styles.btnEditText}>Editar</Text>
                                </Pressable>
                                <Pressable onPress={() => handleDelete(acc)} style={styles.btnDelete} android_ripple={{ color: '#fee2e2' }}>
                                    <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                                    <Text style={styles.btnDeleteText}>Excluir</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Cartões */}
                <View className="px-6 mb-8">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-sm font-black text-slate-400 uppercase tracking-widest">Cartões de Crédito</Text>
                        <Pressable onPress={openCreateCc} hitSlop={10}>
                            <MaterialIcons name="add-circle" size={24} color="#9333ea" />
                        </Pressable>
                    </View>

                    {creditCards.length === 0 && !loading && (
                        <Pressable onPress={openCreateCc} style={[styles.emptyCard, { borderColor: '#f3e8ff' }]}>
                            <MaterialIcons name="credit-card" size={32} color="#d8b4fe" />
                            <Text style={[styles.emptyText, { color: '#c084fc' }]}>Nenhum cartão. Toque para adicionar.</Text>
                        </Pressable>
                    )}

                    {creditCards.map(cc => (
                        <View key={cc.id} className="bg-white p-5 rounded-2xl mb-3 border border-slate-100 shadow-sm">
                            <View className="flex-row justify-between items-center">
                                <View className="flex-row items-center gap-4">
                                    <View className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 items-center justify-center">
                                        <MaterialIcons name="credit-card" size={24} color="#9333ea" />
                                    </View>
                                    <View>
                                        <Text className="text-base font-bold text-slate-800">{cc.name}</Text>
                                        <Text className="text-xs font-medium text-slate-400">Vence dia {cc.dueDay}</Text>
                                    </View>
                                </View>
                                <View className="items-end">
                                    <Text className="text-xs font-bold text-slate-400 uppercase">Limite</Text>
                                    <Text className="text-base font-black text-slate-800">
                                        {formatCurrency(cc.limit)}
                                    </Text>
                                </View>
                            </View>

                            {/* Ações Cartão */}
                            <View style={styles.actionRow}>
                                <Pressable onPress={() => openEditCc(cc)} style={styles.btnEdit} android_ripple={{ color: '#e0e7ff' }}>
                                    <MaterialIcons name="edit" size={16} color="#4f46e5" />
                                    <Text style={styles.btnEditText}>Editar</Text>
                                </Pressable>
                                <Pressable onPress={() => handleDeleteCc(cc)} style={styles.btnDelete} android_ripple={{ color: '#fef2f2' }}>
                                    <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                                    <Text style={styles.btnDeleteText}>Excluir</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
                <View className="h-10" />
            </ScrollView>

            {/* ---- Modal CRIAR ---- */}
            <AccountFormModal
                visible={createModal}
                title="Nova Conta"
                name={name} setName={setName}
                type={type} setType={setType}
                balance={balance} setBalance={setBalance}
                saving={saving}
                onCancel={() => setCreateModal(false)}
                onSave={handleCreate}
                formatCurrencyInput={(v: string) => formatCurrencyInput(v, currency)}
            />

            {/* ---- Modal EDITAR ---- */}
            <AccountFormModal
                visible={editModal}
                title="Editar Conta"
                name={editName} setName={setEditName}
                type={editType} setType={setEditType}
                balance={editBalance} setBalance={setEditBalance}
                saving={saving}
                onCancel={() => setEditModal(false)}
                onSave={handleEdit}
                formatCurrencyInput={(v: string) => formatCurrencyInput(v, currency)}
            />

            {/* ---- Modal CARTÃO ---- */}
            <CreditCardFormModal
                visible={ccModal}
                title={editCc ? "Editar Cartão" : "Novo Cartão"}
                name={ccName} setName={setCcName}
                limit={ccLimit} setLimit={setCcLimit}
                closingDay={ccClosingDay} setClosingDay={setCcClosingDay}
                dueDay={ccDueDay} setDueDay={setCcDueDay}
                accountId={ccAccountId} setAccountId={setCcAccountId}
                accounts={accounts}
                saving={saving}
                onCancel={() => setCcModal(false)}
                onSave={handleSaveCc}
            />
        </>
    );
}

// ---------- Sub-componente do modal de formulário ----------
function AccountFormModal({ visible, title, name, setName, type, setType, balance, setBalance, saving, onCancel, onSave, formatCurrencyInput }: {
    visible: boolean; title: string;
    name: string; setName: (v: string) => void;
    type: string; setType: (v: string) => void;
    balance: string; setBalance: (v: string) => void;
    saving: boolean; onCancel: () => void; onSave: () => void;
    formatCurrencyInput: (v: string) => string;
}) {
    const ACCOUNT_TYPES = ['CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH', 'OTHER'];
    const ACCOUNT_TYPE_LABELS: Record<string, string> = {
        CHECKING: 'Conta Corrente', SAVINGS: 'Poupança',
        INVESTMENT: 'Investimentos', CASH: 'Dinheiro', OTHER: 'Outro',
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <Text style={styles.sheetTitle}>{title}</Text>

                    <Text style={styles.label}>Instituição ou Local</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {BANKS.map(b => (
                                <Pressable key={b} onPress={() => setName(b)} style={[styles.typeChip, name === b && styles.typeChipActive]}>
                                    <Text style={[styles.typeChipText, name === b && styles.typeChipTextActive]}>{b}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>

                    <Text style={styles.label}>Tipo</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            {ACCOUNT_TYPES.map(t => (
                                <Pressable key={t} onPress={() => setType(t)} style={[styles.typeChip, type === t && styles.typeChipActive]}>
                                    <Text style={[styles.typeChipText, type === t && styles.typeChipTextActive]}>{ACCOUNT_TYPE_LABELS[t]}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>

                    <Text style={styles.label}>Saldo</Text>
                    <TextInput
                        style={styles.input} placeholder="0,00" placeholderTextColor="#94a3b8"
                        keyboardType="numeric" value={balance}
                        onChangeText={(v) => setBalance(formatCurrencyInput(v))}
                    />

                    <View style={styles.row}>
                        <Pressable onPress={onCancel} style={styles.btnCancel}>
                            <Text style={styles.btnCancelText}>Cancelar</Text>
                        </Pressable>
                        <Pressable onPress={onSave} style={styles.btnSave} disabled={saving}>
                            {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.btnSaveText}>Salvar</Text>}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// ---------- Sub-componente do modal de Cartão ----------
function CreditCardFormModal({
    visible, title, accounts,
    name, setName,
    limit, setLimit,
    closingDay, setClosingDay,
    dueDay, setDueDay,
    accountId, setAccountId,
    saving, onCancel, onSave
}: {
    visible: boolean; title: string; accounts: Account[];
    name: string; setName: (v: string) => void;
    limit: string; setLimit: (v: string) => void;
    closingDay: string; setClosingDay: (v: string) => void;
    dueDay: string; setDueDay: (v: string) => void;
    accountId: string; setAccountId: (v: string) => void;
    saving: boolean; onCancel: () => void; onSave: () => void;
}) {
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <Text style={styles.sheetTitle}>{title}</Text>

                    <Text style={styles.label}>Nome do Cartão</Text>
                    <TextInput style={styles.input} placeholder="Ex: Nubank, Itaú..." placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Limite Mensal</Text>
                            <TextInput
                                style={styles.input} placeholder="0.00" placeholderTextColor="#94a3b8"
                                keyboardType="numeric" value={limit} onChangeText={setLimit}
                            />
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Corte</Text>
                            <TextInput
                                style={styles.input} placeholder="Dia" placeholderTextColor="#94a3b8"
                                keyboardType="numeric" value={closingDay} onChangeText={setClosingDay}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Venc.</Text>
                            <TextInput
                                style={styles.input} placeholder="Dia" placeholderTextColor="#94a3b8"
                                keyboardType="numeric" value={dueDay} onChangeText={setDueDay}
                            />
                        </View>
                    </View>

                    <Text style={styles.label}>Conta para Débito (Opcional)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable
                                onPress={() => setAccountId('')}
                                style={[styles.typeChip, !accountId && styles.typeChipActive]}
                            >
                                <Text style={[styles.typeChipText, !accountId && styles.typeChipTextActive]}>Nenhuma</Text>
                            </Pressable>
                            {accounts.map(acc => (
                                <Pressable
                                    key={acc.id}
                                    onPress={() => setAccountId(acc.id)}
                                    style={[styles.typeChip, accountId === acc.id && styles.typeChipActive]}
                                >
                                    <Text style={[styles.typeChipText, accountId === acc.id && styles.typeChipTextActive]}>{acc.name}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.row}>
                        <Pressable onPress={onCancel} style={styles.btnCancel}>
                            <Text style={styles.btnCancelText}>Cancelar</Text>
                        </Pressable>
                        <Pressable onPress={onSave} style={[styles.btnSave, { backgroundColor: '#9333ea' }]} disabled={saving}>
                            {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={styles.btnSaveText}>Salvar</Text>}
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    addButton: { backgroundColor: '#4f46e5', borderRadius: 14, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', elevation: 4 },
    emptyCard: { borderWidth: 2, borderColor: '#e0e7ff', borderStyle: 'dashed', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingVertical: 32, gap: 8 },
    emptyText: { color: '#a5b4fc', fontWeight: '600', fontSize: 14 },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
    btnEdit: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#eef2ff' },
    btnEditText: { color: '#4f46e5', fontWeight: '700', fontSize: 13 },
    btnDelete: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#fef2f2' },
    btnDeleteText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: 'white', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
    handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 99, alignSelf: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1e293b', marginBottom: 16 },
    typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc' },
    typeChipActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
    typeChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
    typeChipTextActive: { color: 'white' },
    row: { flexDirection: 'row', gap: 12, marginTop: 8 },
    btnCancel: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#e2e8f0', alignItems: 'center' },
    btnCancelText: { fontSize: 15, fontWeight: '700', color: '#64748b' },
    btnSave: { flex: 2, paddingVertical: 14, borderRadius: 14, backgroundColor: '#4f46e5', alignItems: 'center', elevation: 4 },
    btnSaveText: { fontSize: 15, fontWeight: '800', color: 'white' },
});
