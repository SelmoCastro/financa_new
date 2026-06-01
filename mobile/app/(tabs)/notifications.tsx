import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, Alert,
  Pressable, ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { notificationService, NotificationDTO } from '../../services/notificationService';
import { useCurrency } from '../../context/CurrencyContext';
import { refreshUnreadCount } from '../../hooks/useNotifications';
import { useOfflineActionGuard } from '../../hooks/useOfflineActionGuard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TYPE_CONFIG: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; color: string; bg: string }> = {
  ACTION_RECURRING: { icon: 'event-repeat', color: '#0891b2', bg: '#ecfeff' },
  ACTION_INSTALLMENT: { icon: 'credit-card', color: '#7c3aed', bg: '#f5f3ff' },
  ACTION_INVOICE_DUE: { icon: 'receipt-long', color: '#f97316', bg: '#fff7ed' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { icon: 'notifications' as const, color: '#64748b', bg: '#f1f5f9' };
}

function formatCurrencyValue(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins <= 1 ? 'agora' : `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const { ensureOnline } = useOfflineActionGuard();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationService.getAll();
      setNotifications(res.data);
      await refreshUnreadCount();
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar notificações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const handleConfirm = async (notif: NotificationDTO) => {
    setActioning(notif.id);
    try {
      ensureOnline('confirmar esta notificação');
      const res = await notificationService.handleAction(notif.id, 'confirm');
      Alert.alert('Confirmado', res.data?.message || 'Transação lançada com sucesso!');
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Não foi possível confirmar.';
      Alert.alert('Atenção', msg);
    } finally {
      setActioning(null);
    }
  };

  const handlePostpone = async (notif: NotificationDTO) => {
    setActioning(notif.id);
    try {
      ensureOnline('adiar esta notificação');
      await notificationService.handleAction(notif.id, 'postpone');
      await fetchData();
    } catch {
      Alert.alert('Erro', 'Não foi possível adiar.');
    } finally {
      setActioning(null);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      ensureOnline('marcar notificações como lidas');
      await notificationService.markAllAsRead();
      await fetchData();
    } catch {}
  };

  const unread = notifications.filter(n => !n.isRead);
  const read = notifications.filter(n => n.isRead);

  const renderCard = (notif: NotificationDTO) => {
    const cfg = getTypeConfig(notif.type);
    const meta = notif.actionMeta || {};
    const isActionable = notif.actionType === 'CONFIRM_PAYMENT' && !notif.isRead;
    const isWorking = actioning === notif.id;

    return (
      <View
        key={notif.id}
        className={`p-4 rounded-2xl border mb-3 ${notif.isRead ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-indigo-200'}`}
        style={notif.isRead ? { opacity: 0.7 } : {}}
      >
        <View className="flex-row items-start gap-3">
          <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: cfg.bg }}>
            <MaterialIcons name={cfg.icon} size={20} color={cfg.color} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="font-bold text-slate-800 dark:text-white text-sm flex-1" numberOfLines={1}>
                {notif.title}
              </Text>
              <Text className="text-xs text-slate-400 dark:text-slate-500 ml-2">{timeAgo(notif.createdAt)}</Text>
            </View>
            <Text className="text-slate-600 dark:text-slate-300 text-xs leading-4" numberOfLines={2}>
              {notif.message}
            </Text>

            {isActionable && (
              <View className="flex-row gap-2 mt-3">
                <Pressable
                  onPress={() => handleConfirm(notif)}
                  disabled={isWorking}
                  className="flex-1 py-2.5 rounded-xl items-center justify-center"
                  style={{ backgroundColor: '#0891b2' }}
                >
                  {isWorking ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-xs uppercase">Confirmar</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => handlePostpone(notif)}
                  disabled={isWorking}
                  className="flex-1 py-2.5 rounded-xl items-center justify-center"
                  style={{ backgroundColor: '#f1f5f9' }}
                >
                  <Text className="text-slate-600 dark:text-slate-300 font-bold text-xs uppercase">Adiar</Text>
                </Pressable>
              </View>
            )}

            {notif.isRead && isActionable === false && notif.actionType === 'CONFIRM_PAYMENT' && (
              <View className="mt-2 flex-row items-center gap-1">
                <MaterialIcons name="check-circle" size={14} color="#10b981" />
                <Text className="text-emerald-600 text-xs font-semibold">Concluída</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 12 }} className="px-6 pb-4 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <Pressable
              onPress={() => router.back()}
              android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
              hitSlop={15}
              className="w-10 h-10 items-center justify-center rounded-xl bg-white dark:bg-slate-900"
            >
              <MaterialIcons name="arrow-back" size={22} color="#334155" />
            </Pressable>
            <View>
              <Text className="text-2xl font-black text-slate-800 dark:text-white">Notificações</Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {unread.length > 0 ? `${unread.length} pendente${unread.length > 1 ? 's' : ''}` : 'Tudo em dia'}
              </Text>
            </View>
          </View>
          {unread.length > 0 && (
            <Pressable onPress={handleMarkAllRead} className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <Text className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Marcar tudo</Text>
            </Pressable>
          )}
        </View>

        {notifications.length === 0 && !loading && (
          <View className="items-center justify-center py-20 px-6">
            <View className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4">
              <MaterialIcons name="notifications-off" size={32} color="#cbd5e1" />
            </View>
            <Text className="text-slate-900 dark:text-white font-bold text-lg mb-2">Nenhuma notificação</Text>
            <Text className="text-slate-500 dark:text-slate-400 text-center text-sm">
              Notificações de contas recorrentes, faturas e parcelas aparecerão aqui.
            </Text>
          </View>
        )}

        {/* Unread */}
        {unread.length > 0 && (
          <View className="px-4">
            {unread.map(renderCard)}
          </View>
        )}

        {/* Read */}
        {read.length > 0 && (
          <View className="px-4 mt-4">
            <Text className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 px-2">Anteriores</Text>
            {read.map(renderCard)}
          </View>
        )}
      </ScrollView>
    </View>
  );
}