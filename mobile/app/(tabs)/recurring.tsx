import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Alert,
  Pressable, Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, DeviceEventEmitter
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { recurringService, RecurringTransactionDTO, WeightData } from '../../services/recurringService';
import { useCurrency } from '../../context/CurrencyContext';
import { useTransactions } from '../../hooks/useTransactions';
import { useFixedTransactions } from '../../hooks/useFixedTransactions';
import { formatCurrencyInput, parseCurrencyToNumber } from '../../utils/currencyUtils';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { useOfflineActionGuard } from '../../hooks/useOfflineActionGuard';
import { useNetworkStatus } from '../../context/NetworkContext';
import { offlineRecurringQueue } from '../../services/offlineRecurringQueue';

type OfflineRecurringTransaction = RecurringTransactionDTO & {
  pendingSync?: boolean;
  offlineLocalId?: string;
};

export default function RecurringScreen() {
  const [recorrentes, setRecorrentes] = useState<OfflineRecurringTransaction[]>([]);
  const [weight, setWeight] = useState<WeightData | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency, currency } = useCurrency();
  const { ensureOnline } = useOfflineActionGuard();
  const { isOnline } = useNetworkStatus();

  // Fixed items from transactions
  const { transactions, setTransactions } = useTransactions();
  const totals = useMemo(() => ({ income: 0, expense: 0, balance: 0, currentIncome: 0, currentExpense: 0 }), []);
  const { fixedItems } = useFixedTransactions(transactions, totals);

  const mergePendingRecurring = useCallback(async (remoteItems: RecurringTransactionDTO[] = []) => {
    const [pending, deletedIds] = await Promise.all([
      offlineRecurringQueue.getPendingOptimisticRecurring(),
      offlineRecurringQueue.getDeletedRecurringIds(),
    ]);
    const deletedSet = new Set(deletedIds);
    const pendingIds = new Set(pending.map(item => item.id));
    const visibleRemote = remoteItems.filter(item => !deletedSet.has(item.id) && !pendingIds.has(item.id));
    setRecorrentes([...(pending as OfflineRecurringTransaction[]), ...visibleRemote]);
  }, []);

  const applyOptimisticRecurring = useCallback((item: OfflineRecurringTransaction) => {
    setRecorrentes(prev => [item, ...prev.filter(existing => existing.id !== item.id)]);
  }, []);

  // Form
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<RecurringTransactionDTO | null>(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [trType, setTrType] = useState('EXPENSE');
  const [dueDay, setDueDay] = useState('1');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rtRes, wRes] = await Promise.allSettled([
        recurringService.getAll(),
        recurringService.getWeight(),
      ]);

      if (rtRes.status === 'fulfilled') {
        await mergePendingRecurring(rtRes.value.data);
      } else {
        await mergePendingRecurring([]);
      }
      if (wRes.status === 'fulfilled') {
        setWeight(wRes.value.data);
      }

      if (rtRes.status === 'rejected' && wRes.status === 'rejected') {
        throw rtRes.reason || wRes.reason;
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os recorrentes.');
    } finally {
      setLoading(false);
    }
  }, [mergePendingRecurring]);

  useFocusEffect(useCallback(() => {
    fetchData();
    const sub = DeviceEventEmitter.addListener(offlineRecurringQueue.syncEvent, () => fetchData());
    return () => sub.remove();
  }, [fetchData]));

  const openCreate = () => {
    setEditing(null);
    setDesc(''); setAmount(''); setTrType('EXPENSE'); setDueDay('1');
    setModalVisible(true);
  };

  const openEdit = (r: RecurringTransactionDTO) => {
    setEditing(r);
    setDesc(r.description);
    setAmount(formatCurrencyInput(String(Math.round(Number(r.amount) * 100)), currency));
    setTrType(r.type);
    setDueDay(String(r.dueDay));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!desc.trim() || !amount) {
      Alert.alert('Atenção', 'Preencha descrição e valor.');
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        description: desc.trim(),
        amount: parseCurrencyToNumber(amount),
        type: trType,
        dueDay: Number(dueDay),
      };
      
      if (editing) {
        if (isOnline) {
          await recurringService.update(editing.id, payload);
          Alert.alert('Sucesso', 'Recorrente atualizado!');
        } else {
          const result = await offlineRecurringQueue.queueRecurringUpdate(editing.id, payload, editing);
          applyOptimisticRecurring(result.optimistic as OfflineRecurringTransaction);
          Alert.alert('Salvo offline', 'O recorrente será atualizado quando a internet voltar.');
        }
      } else {
        if (isOnline) {
          await recurringService.create(payload);
          Alert.alert('Sucesso', 'Recorrente criado!');
        } else {
          const result = await offlineRecurringQueue.queueRecurringCreate(payload);
          applyOptimisticRecurring(result.optimistic as OfflineRecurringTransaction);
          Alert.alert('Salvo offline', 'O recorrente será criado quando a internet voltar.');
        }
      }
      
      setModalVisible(false);
      await fetchData();
    } catch (error: any) {
      const errorCode = error?.code;
      const status = error?.response?.status;
      const isNetworkError = !status || 
        errorCode === 'ERR_NETWORK' || 
        errorCode === 'ECONNABORTED' ||
        String(error?.message || '').toLowerCase().includes('network');
      
      if (isNetworkError) {
        try {
          if (editing) {
            const result = await offlineRecurringQueue.queueRecurringUpdate(editing.id, {
              description: desc.trim(),
              amount: parseCurrencyToNumber(amount),
              type: trType,
              dueDay: Number(dueDay),
            }, editing);
            applyOptimisticRecurring(result.optimistic as OfflineRecurringTransaction);
          } else {
            const result = await offlineRecurringQueue.queueRecurringCreate({
              description: desc.trim(),
              amount: parseCurrencyToNumber(amount),
              type: trType,
              dueDay: Number(dueDay),
            });
            applyOptimisticRecurring(result.optimistic as OfflineRecurringTransaction);
          }

          // Tenta sincronizar imediatamente — se a rede já estiver de volta,
          // o sync resolve agora. Se falhar, fica na fila pra quando reconectar.
          const syncResult = await offlineRecurringQueue.syncPendingRecurringQueue();
          if (syncResult.synced > 0) {
            Alert.alert('Sucesso', editing ? 'Recorrente atualizado!' : 'Recorrente criado!');
          } else {
            Alert.alert('Salvo offline', 'O recorrente será sincronizado quando a conexão estabilizar.');
          }
          setModalVisible(false);
          await fetchData();
          return;
        } catch (offlineError: any) {
          if (__DEV__) {
            console.error('Falha ao salvar recorrente offline:', offlineError);
          }
        }
      }
      
      Alert.alert('Erro', 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      if (isOnline) {
        await recurringService.toggle(id);
        await fetchData();
      } else {
        Alert.alert('Sem internet', 'Conecte-se à internet para alternar o status deste recorrente.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível alternar status.');
    }
  };

  const handleDelete = async (id: string, description: string) => {
    Alert.alert('Remover', `Excluir "${description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            if (isOnline) {
              await recurringService.remove(id);
              Alert.alert('Sucesso', 'Recorrente excluído!');
            } else {
              const item = recorrentes.find(r => r.id === id);
              await offlineRecurringQueue.queueRecurringDelete(id, item);
              setRecorrentes(prev => prev.filter(r => r.id !== id));
              Alert.alert('Salvo offline', 'O recorrente será excluído quando a internet voltar.');
            }
            await fetchData();
          } catch (error: any) {
            const errorCode = error?.code;
            const status = error?.response?.status;
            const isNetworkError = !status || 
              errorCode === 'ERR_NETWORK' || 
              errorCode === 'ECONNABORTED' ||
              String(error?.message || '').toLowerCase().includes('network');
            
            if (isNetworkError) {
              try {
                const item = recorrentes.find(r => r.id === id);
                await offlineRecurringQueue.queueRecurringDelete(id, item);
                setRecorrentes(prev => prev.filter(r => r.id !== id));
                Alert.alert('Salvo offline', 'A internet caiu. O recorrente será excluído quando a conexão voltar.');
                await fetchData();
                return;
              } catch (offlineError: any) {
                if (__DEV__) {
                  console.error('Falha ao excluir recorrente offline:', offlineError);
                }
              }
            }
            
            Alert.alert('Erro', 'Não foi possível excluir.');
          }
        }
      }
    ]);
  };

  const handleRemoveFixed = (txId: string, desc: string) => {
    Alert.alert(
      'Parar de Repetir',
      `Deseja remover "${desc}" dos fixos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar', style: 'destructive',
          onPress: async () => {
            if (!ensureOnline('atualizar este lançamento fixo')) return;
            try {
              await api.patch(`/transactions/${txId}`, { isFixed: false });
              setTransactions(prev => prev.map(t => t.id === txId ? { ...t, isFixed: false } : t));
            } catch {
              Alert.alert('Erro', 'Falha ao atualizar.');
            }
          }
        }
      ]
    );
  };

  const today = new Date().getDate();
  const pct = weight?.weight || 0;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View className="px-6 pt-6 pb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-black text-slate-800 dark:text-white">Recorrentes & Fixos</Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">Despesas e receitas fixas</Text>
          </View>
          <Pressable onPress={openCreate} style={{ backgroundColor: '#0891b2', borderRadius: 999, padding: 12 }}>
            <MaterialIcons name="add" size={24} color="white" />
          </Pressable>
        </View>

        {/* Weight Card */}
        {weight && (
          <View className="px-6 mb-6">
            <View className="bg-cyan-600 rounded-[24px] p-6">
              <View className="flex-row items-center gap-2 mb-2 opacity-90">
                <MaterialIcons name="pie-chart" size={20} color="white" />
                <Text className="text-cyan-100 font-medium text-sm">Comprometimento da Renda</Text>
              </View>
              <Text className="text-white text-4xl font-black mb-3">{pct}%</Text>
              <View className="w-full h-3 bg-white dark:bg-slate-900/20 rounded-full overflow-hidden mb-2">
                <View
                  className={`h-full rounded-full ${pct > 50 ? 'bg-rose-400' : pct > 30 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </View>
              <Text className="text-cyan-100 text-xs font-bold">
                {formatCurrency(weight.totalFixedExpense)} de {formatCurrency(weight.monthlyIncome)} • {weight.count} ativos
              </Text>
            </View>
          </View>
        )}

        {/* Seção: Recorrentes (from backend) */}
        {!loading && (
          <View className="px-6 mb-2">
            <Text className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Programados (Recorrentes)</Text>
          </View>
        )}
        {recorrentes.length === 0 && !loading && (
          <View className="items-center justify-center py-10 px-6">
            <View className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-3">
              <MaterialIcons name="event-repeat" size={24} color="#cbd5e1" />
            </View>
            <Text className="text-slate-500 dark:text-slate-400 text-center text-sm">
              Adicione suas despesas fixas programadas aqui.
            </Text>
          </View>
        )}

        <View className="px-4 space-y-3">
          {recorrentes.map(r => {
            const isDueToday = r.isActive && r.dueDay === today;
            const isOverdue = r.isActive && r.dueDay < today && r.startMonth <= (new Date().getMonth() + 1);
            return (
            <View key={r.id} className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border shadow-sm ${!r.isActive ? 'border-slate-50 dark:border-slate-800 opacity-50' : isDueToday ? 'border-amber-300' : isOverdue ? 'border-rose-200' : 'border-slate-100 dark:border-slate-800'}`}>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center gap-4 flex-1">
                  <View className={`w-12 h-12 rounded-xl items-center justify-center ${r.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-rose-50 dark:bg-rose-950/40'}`}>
                    <MaterialIcons
                      name={r.type === 'INCOME' ? 'arrow-upward' : 'arrow-downward'}
                      size={24}
                      color={r.type === 'INCOME' ? '#10b981' : '#f43f5e'}
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-bold text-slate-700 dark:text-slate-100 text-base">{r.description}</Text>
                      {isDueToday && <View className="bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full"><Text className="text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">Hoje</Text></View>}
                      {isOverdue && <View className="bg-rose-100 px-2 py-0.5 rounded-full"><Text className="text-rose-700 dark:text-rose-300 text-[10px] font-black uppercase">Vencido</Text></View>}
                      {r.pendingSync && <View className="bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-full"><Text className="text-amber-700 dark:text-amber-300 text-[10px] font-black uppercase">Pendente</Text></View>}
                    </View>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Text className={`font-black text-sm ${r.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(Number(r.amount))}
                      </Text>
                      <Text className="text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Dia {r.dueDay}</Text>
                    </View>
                  </View>
                </View>

                <View className="items-end gap-3">
                  <View className="flex-row gap-1">
                    <Pressable onPress={() => handleToggle(r.id)} className="p-1">
                      <MaterialIcons name={r.isActive ? "toggle-on" : "toggle-off"} size={28} color={r.isActive ? '#0891b2' : '#94a3b8'} />
                    </Pressable>
                  </View>
                  <View className="flex-row gap-1">
                    <Pressable onPress={() => openEdit(r)} className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                      <MaterialIcons name="edit" size={16} color="#4f46e5" />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(r.id, r.description)} className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40">
                      <MaterialIcons name="delete" size={16} color="#ef4444" />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          );
          })}
        </View>

        {/* Seção: Fixos (from transaction isFixed flag) — hide items that already exist as recorrentes */}
        {(() => {
          const recorrenteKeys = new Set(recorrentes.map(r => r.description.toLowerCase().trim()));
          const uniqueFixedItems = fixedItems.filter(item => !recorrenteKeys.has(item.name.toLowerCase().trim()));
          return uniqueFixedItems.length > 0 && !loading ? (
            <>
              <View className="px-6 mt-8 mb-2">
                <Text className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Fixos (detectados)</Text>
              </View>
              <View className="px-4 space-y-3">
                {uniqueFixedItems.map(item => (
                  <View key={item.lastTransactionId} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex-row justify-between items-center">
                    <View className="flex-row items-center gap-4">
                      <View className={`w-12 h-12 rounded-xl items-center justify-center ${item.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-rose-50 dark:bg-rose-950/40'}`}>
                        <MaterialIcons
                          name={item.type === 'INCOME' ? 'arrow-upward' : 'arrow-downward'}
                          size={24}
                          color={item.type === 'INCOME' ? '#10b981' : '#f43f5e'}
                        />
                      </View>
                      <View>
                        <Text className="font-bold text-slate-700 dark:text-slate-100 text-base">{item.name}</Text>
                        <View className="flex-row items-center gap-2">
                          <Text className="text-xs text-slate-400 dark:text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">{item.category}</Text>
                          {item.day && <Text className="text-xs text-slate-400 dark:text-slate-500">Todo dia {item.day}</Text>}
                        </View>
                      </View>
                    </View>

                    <View className="items-end gap-2">
                      <Text className={`font-black text-base ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-100'}`}>
                        {formatCurrency(item.amount)}
                      </Text>
                      <View className="rounded-lg overflow-hidden bg-red-50 dark:bg-red-950/40">
                        <Pressable
                          onPress={() => { handleRemoveFixed(item.lastTransactionId, item.name); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                          android_ripple={{ color: 'rgba(239,68,68,0.2)' }}
                          className="p-1"
                        >
                          <MaterialIcons name="delete" size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null;
        })()}
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 99, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1e293b', marginBottom: 20 }}>{editing ? 'Editar Recorrente' : 'Novo Recorrente'}</Text>

            <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Descrição</Text>
            <TextInput
              style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: '600', marginBottom: 16, color: '#1e293b' }}
              placeholder="Ex: Aluguel" placeholderTextColor="#94a3b8"
              value={desc} onChangeText={setDesc}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Tipo</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable onPress={() => setTrType('EXPENSE')} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: trType === 'EXPENSE' ? '#f43f5e' : '#f1f5f9', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '700', fontSize: 12, color: trType === 'EXPENSE' ? 'white' : '#64748b' }}>Despesa</Text>
                  </Pressable>
                  <Pressable onPress={() => setTrType('INCOME')} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: trType === 'INCOME' ? '#10b981' : '#f1f5f9', alignItems: 'center' }}>
                    <Text style={{ fontWeight: '700', fontSize: 12, color: trType === 'INCOME' ? 'white' : '#64748b' }}>Receita</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Valor</Text>
                <TextInput
                  style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: '600', color: '#1e293b' }}
                  placeholder="0,00" placeholderTextColor="#94a3b8" keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Vencimento</Text>
                <TextInput
                  style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, padding: 16, fontSize: 16, fontWeight: '600', color: '#1e293b' }}
                  placeholder="Dia" placeholderTextColor="#94a3b8" keyboardType="numeric"
                  value={dueDay} onChangeText={setDueDay}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <Pressable onPress={() => setModalVisible(false)} style={{ flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#64748b', textTransform: 'uppercase', fontSize: 12 }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleSave} style={{ flex: 2, padding: 16, borderRadius: 16, backgroundColor: '#0891b2', alignItems: 'center' }} disabled={saving}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={{ fontWeight: '800', color: 'white', textTransform: 'uppercase', fontSize: 13 }}>{editing ? 'Salvar' : 'Criar'}</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
