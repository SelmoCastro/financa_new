import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Platform, Pressable } from 'react-native';
import { MonthProvider } from '../../context/MonthContext';
import { TransactionsProvider } from '../../context/TransactionsContext';
import { useNotifications, refreshUnreadCount } from '../../hooks/useNotifications';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

function NotificationsBadge() {
  const { unreadCount } = useNotifications();
  if (unreadCount <= 0) return null;
  return (
    <View style={{
      position: 'absolute', top: -4, right: -4,
      backgroundColor: '#ef4444', borderRadius: 999,
      minWidth: 18, height: 18,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: 'white', fontSize: 10, fontWeight: '800' }}>
        {unreadCount > 9 ? '9+' : unreadCount}
      </Text>
    </View>
  );
}

function NotificationBell() {
  const router = useRouter();
  const { unreadCount } = useNotifications();
  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/notifications'); }}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      hitSlop={15}
      style={{ position: 'relative', padding: 6 }}
    >
      <MaterialIcons name={unreadCount > 0 ? 'notifications-active' : 'notifications-none'} size={24} color={unreadCount > 0 ? '#4f46e5' : '#64748b'} />
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute', top: 2, right: 2,
          backgroundColor: '#ef4444', borderRadius: 999,
          minWidth: 16, height: 16,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: 'white', fontSize: 9, fontWeight: '800' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export { NotificationBell };

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Refresh notification badge count when tab view gains focus
  useFocusEffect(useCallback(() => { refreshUnreadCount(); }, []));

  return (
    <MonthProvider>
      <TransactionsProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
              elevation: 0,
            },
            tabBarActiveTintColor: '#4f46e5',
            tabBarInactiveTintColor: '#94a3b8',
          }}
        >
          <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <MaterialIcons name="grid-view" size={24} color={color} /> }} />
          <Tabs.Screen name="notifications" options={{ href: null }} />
          <Tabs.Screen name="accounts" options={{ title: 'Contas', tabBarIcon: ({ color }) => <MaterialIcons name="account-balance-wallet" size={24} color={color} /> }} />
          <Tabs.Screen name="recurring" options={{ title: 'Fixo/Recorr.', tabBarIcon: ({ color }) => <MaterialIcons name="event-repeat" size={24} color={color} /> }} />
          <Tabs.Screen name="transactions" options={{ title: 'Extrato', tabBarIcon: ({ color }) => <MaterialIcons name="receipt-long" size={24} color={color} /> }} />
          <Tabs.Screen name="budgets" options={{ title: 'Orç.', tabBarIcon: ({ color }) => <MaterialIcons name="pie-chart" size={24} color={color} /> }} />
          <Tabs.Screen name="goals" options={{ title: 'Metas', tabBarIcon: ({ color }) => <MaterialIcons name="track-changes" size={24} color={color} /> }} />
          <Tabs.Screen name="reports" options={{ title: 'Relat.', tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={24} color={color} /> }} />
        </Tabs>
      </TransactionsProvider>
    </MonthProvider>
  );
}
