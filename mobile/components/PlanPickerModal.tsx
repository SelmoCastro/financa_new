import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { openCheckout, PlanId } from '../services/paymentService';

type PlanPickerProps = {
  visible: boolean;
  onClose: () => void;
};

const PLANS: { id: PlanId; label: string; price: string; desc: string; badge?: string }[] = [
  { id: 'premium_monthly', label: 'Mensal', price: 'R$ 19,90', desc: '1 mês de Premium' },
  { id: 'premium_quarterly', label: 'Trimestral', price: 'R$ 54,90', desc: '3 meses • R$ 18,30/mês', badge: 'ECONÔMICO' },
  { id: 'premium_semiannual', label: 'Semestral', price: 'R$ 99,90', desc: '6 meses • R$ 16,65/mês', badge: 'POPULAR' },
  { id: 'premium_annual', label: 'Anual', price: 'R$ 179,90', desc: '12 meses • R$ 14,99/mês', badge: 'MELHOR VALOR' },
];

export const PlanPickerModal: React.FC<PlanPickerProps> = ({ visible, onClose }) => {
  const [loading, setLoading] = useState<PlanId | null>(null);

  const handleSelect = async (plan: PlanId) => {
    setLoading(plan);
    try {
      await openCheckout(plan);
      onClose();
    } finally {
      setLoading(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-gray-900 rounded-t-3xl p-6 pb-10">
          <View className="items-center mb-5">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Seja Premium 🚀
            </Text>
            <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
              Recursos ilimitados para suas finanças
            </Text>
          </View>

          <ScrollView className="mb-4">
            {PLANS.map((plan) => {
              const isLoading = loading === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => handleSelect(plan.id)}
                  disabled={!!loading}
                  className={`flex-row items-center justify-between p-4 mb-2 rounded-xl border-2 ${
                    plan.badge === 'MELHOR VALOR'
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">
                        {plan.label}
                      </Text>
                      {plan.badge && (
                        <View className="bg-indigo-600 px-2 py-0.5 rounded-full">
                          <Text className="text-[10px] font-bold text-white">{plan.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {plan.desc}
                    </Text>
                  </View>
                  <View className="items-end ml-3">
                    <Text className="text-lg font-bold text-gray-900 dark:text-white">
                      {plan.price}
                    </Text>
                    {isLoading && <ActivityIndicator size="small" color="#6366f1" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            onPress={onClose}
            disabled={!!loading}
            className="items-center py-3 rounded-xl bg-gray-100 dark:bg-gray-800"
          >
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Continuar Grátis
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
