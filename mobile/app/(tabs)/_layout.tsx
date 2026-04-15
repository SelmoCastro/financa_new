import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { MonthProvider } from '../../context/MonthContext';
import { TransactionsProvider } from '../../context/TransactionsContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

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
          <Tabs.Screen name="budgets" options={{ title: 'Orçamentos', tabBarIcon: ({ color }) => <MaterialIcons name="pie-chart" size={24} color={color} /> }} />
          <Tabs.Screen name="goals" options={{ title: 'Metas', tabBarIcon: ({ color }) => <MaterialIcons name="track-changes" size={24} color={color} /> }} />
          <Tabs.Screen name="fixed" options={{ title: 'Fixos', tabBarIcon: ({ color }) => <MaterialIcons name="event-repeat" size={24} color={color} /> }} />
        </Tabs>
      </TransactionsProvider>
    </MonthProvider>
  );
}
