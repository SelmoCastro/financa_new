import React, { useMemo, useState } from 'react';
import { getStartOfDay, getYearMonth, parseDate } from '../../utils/dateUtils';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTransactions } from '../../hooks/useTransactions';
import { useFixedTransactions } from '../../hooks/useFixedTransactions';
import TransactionModal from '../../components/TransactionModal';

export default function DashboardScreen() {
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const { transactions, loading, refreshing, onRefresh, isPrivacyEnabled, togglePrivacy } = useTransactions();

  const [modalVisible, setModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  const openModal = (type: 'INCOME' | 'EXPENSE') => {
    setTransactionType(type);
    setModalVisible(true);
  };

  const { totals, rule503020 } = useMemo(() => {
    const now = new Date();
    const { year: currentYear, month: currentMonth } = getYearMonth(now);
    const todayStart = getStartOfDay(now);

    const current = { income: 0, expense: 0 };
    const balanceTotal = { value: 0 };

    // 50/30/20 data
    const needsCategories = ['Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Educação', 'Contas e Serviços'];
    const wantsCategories = ['Lazer', 'Outros', 'Compras', 'Restaurantes', 'Assinaturas', 'Viagem', 'Cuidados Pessoais', 'Presentes'];
    const savingsCategories = ['Investimentos (Aporte)', 'Dívidas/Financiamentos'];

    let needs = 0;
    let wants = 0;
    let savings = 0;

    transactions.forEach(t => {
      const amount = Number(t.amount);
      const date = parseDate(t.date);
      const tDateOnly = getStartOfDay(date);
      const { year: tYear, month: tMonth } = getYearMonth(date);

      // Balance Calculation (All time up to today approx? Original logic: <= todayStart)
      // Note: Original logic used <= todayStart for balance.
      if (tDateOnly <= todayStart) {
        if (t.type === 'INCOME') balanceTotal.value += amount;
        else balanceTotal.value -= amount;
      }

      // Current Month Totals
      if (tMonth === currentMonth && tYear === currentYear) {
        if (t.type === 'INCOME') {
          current.income += amount;
        } else {
          current.expense += amount;

          // Rule 50/30/20 (Expenses only)
          if (needsCategories.includes(t.category)) needs += amount;
          else if (wantsCategories.includes(t.category)) wants += amount;
          else if (savingsCategories.includes(t.category)) savings += amount;
          else wants += amount; // Fallback to wants
        }
      }
    });

    const totalIncome = current.income || 1;

    return {
      totals: {
        balance: balanceTotal.value,
        currentIncome: current.income,
        currentExpense: current.expense,
        income: 0 // Legacy field potentially unused or for backward compat
      },
      rule503020: {
        needs: { value: needs, percent: (needs / totalIncome) * 100 },
        wants: { value: wants, percent: (wants / totalIncome) * 100 },
        savings: { value: savings, percent: (savings / totalIncome) * 100 }
      }
    };
  }, [transactions]);

  const forecast = useFixedTransactions(transactions, totals);

  const topVillains = useMemo(() => {
    if (!forecast || !forecast.topVillains) return [];
    return forecast.topVillains.slice(0, 3);
  }, [forecast]);

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
        {/* Header */}
        <View className="bg-white p-6 pt-12 rounded-b-[40px] shadow-sm mb-6" style={{ paddingTop: insets.top + 20 }}>
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-slate-500 text-sm">Bem-vindo de volta,</Text>
              <Text className="text-2xl font-black text-slate-800">Resumo Financeiro</Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => openModal('EXPENSE')} className="p-2 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200">
                <MaterialIcons name="add" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity onPress={togglePrivacy} className="p-2 bg-slate-100 rounded-full">
                <MaterialIcons name={isPrivacyEnabled ? "visibility-off" : "visibility"} size={24} color="#64748b" />
              </TouchableOpacity>
              <TouchableOpacity onPress={logout} className="bg-slate-100 p-2 rounded-full">
                <MaterialIcons name="logout" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Cards Grid */}
          <View className="flex-row flex-wrap gap-4">
            <View className="w-[47%] bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
              <View className="flex-row items-center gap-2 mb-2">
                <MaterialIcons name="account-balance-wallet" size={16} color="#e0e7ff" />
                <Text className="text-indigo-100 text-[10px] font-bold uppercase tracking-wider">Saldo Projetado</Text>
              </View>
              <Text className="text-white text-xl font-black">{formatValue(forecast.projectedBalance)}</Text>
            </View>

            <View className="w-[47%] bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
              <View className="flex-row items-center gap-2 mb-2">
                <MaterialIcons name="attach-money" size={16} color="#4f46e5" />
                <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Saldo Atual</Text>
              </View>
              <Text className="text-slate-800 text-xl font-black">{formatValue(totals.balance)}</Text>
            </View>

            <View className="w-[47%] bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
              <Text className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider mb-1">Entradas (Mês)</Text>
              <Text className="text-emerald-700 text-lg font-black">{formatValue(totals.currentIncome)}</Text>
            </View>

            <View className="w-[47%] bg-rose-50 border border-rose-100 p-4 rounded-2xl">
              <Text className="text-rose-600 text-[10px] font-bold uppercase tracking-wider mb-1">Saídas (Mês)</Text>
              <Text className="text-rose-700 text-lg font-black">{formatValue(totals.currentExpense)}</Text>
            </View>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" />
        ) : (
          <View className="px-4 space-y-4">
            {/* Commitment */}
            <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <View className="flex-row justify-between mb-2">
                <Text className="text-xs font-bold text-slate-500 uppercase">Comprometimento</Text>
                <View className="bg-indigo-100 px-2 py-0.5 rounded">
                  <Text className="text-[10px] font-bold text-indigo-700">{forecast.fixedRatio.toFixed(0)}%</Text>
                </View>
              </View>
              <View className="h-4 bg-slate-100 rounded-full overflow-hidden flex-row mb-2">
                <View className="h-full bg-slate-800" style={{ width: `${Math.min(forecast.fixedRatio, 100)}%` }} />
                <View className="h-full bg-emerald-400 flex-1" />
              </View>
              <Text className="text-[10px] text-slate-400">
                Fixo: {formatValue(forecast.totalFixedExpense)}
              </Text>
            </View>

            {/* Fixed Pending */}
            <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <Text className="text-xs font-bold text-slate-500 uppercase mb-4">Fixos Pendentes</Text>
              {forecast.missingFixed.length === 0 ? (
                <Text className="text-slate-400 text-xs">Tudo pago!</Text>
              ) : (
                forecast.missingFixed.map((item, idx) => (
                  <View key={idx} className="flex-row justify-between items-center py-2 border-b border-slate-50 last:border-0">
                    <Text className="text-sm font-bold text-slate-700">{item.description}</Text>
                    <Text className="text-rose-500 font-bold text-sm">- {formatValue(item.amount)}</Text>
                  </View>
                ))
              )}
            </View>

            {/* Top Villains */}
            <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
              <View className="flex-row justify-between mb-4">
                <Text className="text-xs font-bold text-slate-500 uppercase">Top Gastos do Mês</Text>
                <MaterialIcons name="trending-down" size={16} color="#eab308" />
              </View>
              {topVillains.map((item, idx) => (
                <View key={idx} className="flex-row justify-between items-center mb-3 last:mb-0">
                  <View className="flex-row items-center gap-3">
                    <View className="w-5 h-5 bg-slate-100 rounded-full items-center justify-center">
                      <Text className="text-[10px] font-bold text-slate-500">{idx + 1}</Text>
                    </View>
                    <Text className="text-sm font-bold text-slate-700">{item.name}</Text>
                  </View>
                  <Text className="text-sm font-black text-slate-800">{formatValue(item.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* MODAL */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={onRefresh}
        initialType={transactionType}
      />
    </View>
  );
}
