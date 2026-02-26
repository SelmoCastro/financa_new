import React, { useState, useCallback } from 'react';
import {
    View, Text, ScrollView, RefreshControl, Alert,
    Pressable, Modal, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import api from '../../services/api';
import { formatCurrency, parseCurrencyToNumber } from '../../utils/currencyUtils';
import { Account, CreditCard } from '../../types';

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

    // Criação
    const [createModal, setCreateModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState('CHECKING');
    const [balance, setBalance] = useState('0,00');

    // Edição
    const [editModal, setEditModal] = useState(false);
    const [editAccount, setEditAccount] = useState<Account | null>(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState('CHECKING');
    const [editBalance, setEditBalance] = useState('0,00');

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
        setName(''); setType('CHECKING'); setBalance('0,00');
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
        setEditBalance(formatCurrency(String(Math.round(acc.balance * 100))));
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
                            R$ {totalBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                                    <View className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 items-center justify-center">
                                        <MaterialIcons name="account-balance" size={24} color="#4f46e5" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-bold text-slate-800">{acc.name}</Text>
                                        <Text className="text-xs font-medium text-slate-400">{ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}</Text>
                                    </View>
                                </View>
                                <Text className="text-base font-black text-slate-800 mr-4">
                                    R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    <Text className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Cartões de Crédito</Text>
                    {creditCards.map(cc => (
                        <View key={cc.id} className="bg-white p-5 rounded-2xl mb-3 border border-slate-100 flex-row justify-between items-center shadow-sm">
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
                                    R$ {cc.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </Text>
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
            />
        </>
    );
}

// ---------- Sub-componente do modal de formulário ----------
function AccountFormModal({ visible, title, name, setName, type, setType, balance, setBalance, saving, onCancel, onSave }: {
    visible: boolean; title: string;
    name: string; setName: (v: string) => void;
    type: string; setType: (v: string) => void;
    balance: string; setBalance: (v: string) => void;
    saving: boolean; onCancel: () => void; onSave: () => void;
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

                    <Text style={styles.label}>Nome da Conta</Text>
                    <TextInput style={styles.input} placeholder="Ex: Nubank, Bradesco..." placeholderTextColor="#94a3b8" value={name} onChangeText={setName} />

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
                        onChangeText={(v) => setBalance(formatCurrency(v))}
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
