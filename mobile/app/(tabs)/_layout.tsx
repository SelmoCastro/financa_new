import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Platform } from 'react-native';
import { MonthProvider } from '../../context/MonthContext';
import { TransactionsProvider } from '../../context/TransactionsContext';
import { useNotifications, refreshUnreadCount } from '../../hooks/useNotifications';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

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
          <Tabs.Screen name="transactions" options={{ title: 'Extrato', tabBarIcon: ({ color }) => <MaterialIcons name="receipt-long" size={24} color={color} /> }} />
          <Tabs.Screen name="accounts" options={{ title: 'Contas', tabBarIcon: ({ color }) => <MaterialIcons name="account-balance-wallet" size={24} color={color} /> }} />
          <Tabs.Screen name="notifications" options={{ title: 'Alertas', tabBarIcon: ({ color, size }) => <View><MaterialIcons name="notifications" size={size} color={color} /><NotificationsBadge /></View> }} />
          <Tabs.Screen name="budgets" options={{ title: 'Orçamentos', tabBarIcon: ({ color }) => <MaterialIcons name="pie-chart" size={24} color={color} /> }} />
          <Tabs.Screen name="goals" options={{ title: 'Metas', tabBarIcon: ({ color }) => <MaterialIcons name="track-changes" size={24} color={color} /> }} />
          <Tabs.Screen name="fixed" options={{ title: 'Fixos', tabBarIcon: ({ color }) => <MaterialIcons name="event-repeat" size={24} color={color} /> }} />
          <Tabs.Screen name="recurring" options={{ title: 'Recorrentes', tabBarIcon: ({ color }) => <MaterialIcons name="loop" size={24} color={color} /> }} />
          <Tabs.Screen name="reports" options={{ title: 'Relatórios', tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={24} color={color} /> }} />
        </Tabs>
      </TransactionsProvider>
    </MonthProvider>
  );
}
