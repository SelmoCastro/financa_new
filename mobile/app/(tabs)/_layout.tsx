import { Tabs, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Platform, Pressable, useColorScheme } from 'react-native';
import { MonthProvider } from '../../context/MonthContext';
import { TransactionsProvider } from '../../context/TransactionsContext';
import { useNotifications, refreshUnreadCount } from '../../hooks/useNotifications';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { OfflineBanner } from '../../components/OfflineBanner';
import { useLanguage } from '../../context/LanguageContext';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/notifications'); }}
      android_ripple={{ color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }}
      hitSlop={15}
      style={{ position: 'relative', padding: 6 }}
    >
      <MaterialIcons name={unreadCount > 0 ? 'notifications-active' : 'notifications-none'} size={24} color={unreadCount > 0 ? '#818cf8' : (isDark ? '#cbd5e1' : '#64748b')} />
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useLanguage();

  // Refresh notification badge count when tab view gains focus
  useFocusEffect(useCallback(() => { refreshUnreadCount(); }, []));

  return (
    <MonthProvider>
      <TransactionsProvider>
        <View style={{ flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' }}>
          <OfflineBanner />
          <Tabs
            screenOptions={{
              headerShown: false,
              sceneStyle: { backgroundColor: isDark ? '#020617' : '#f8fafc' },
              tabBarStyle: {
                backgroundColor: isDark ? '#0f172a' : '#ffffff',
                borderTopColor: isDark ? '#1e293b' : '#e2e8f0',
                paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
                elevation: 0,
              },
              tabBarActiveTintColor: isDark ? '#818cf8' : '#4f46e5',
              tabBarInactiveTintColor: isDark ? '#64748b' : '#94a3b8',
            }}
          >
            <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <MaterialIcons name="grid-view" size={24} color={color} /> }} />
            <Tabs.Screen name="notifications" options={{ href: null }} />
            <Tabs.Screen name="accounts" options={{ title: t('tabs.accounts'), tabBarIcon: ({ color }) => <MaterialIcons name="account-balance-wallet" size={24} color={color} /> }} />
            <Tabs.Screen name="recurring" options={{ title: t('tabs.recurring'), tabBarIcon: ({ color }) => <MaterialIcons name="event-repeat" size={24} color={color} /> }} />
            <Tabs.Screen name="transactions" options={{ title: t('tabs.transactions'), tabBarIcon: ({ color }) => <MaterialIcons name="receipt-long" size={24} color={color} /> }} />
            <Tabs.Screen name="budgets" options={{ title: t('tabs.budgets'), tabBarIcon: ({ color }) => <MaterialIcons name="pie-chart" size={24} color={color} /> }} />
            <Tabs.Screen name="goals" options={{ title: t('tabs.goals'), tabBarIcon: ({ color }) => <MaterialIcons name="track-changes" size={24} color={color} /> }} />
            <Tabs.Screen name="reports" options={{ title: t('tabs.reports'), tabBarIcon: ({ color }) => <MaterialIcons name="bar-chart" size={24} color={color} /> }} />
          </Tabs>
        </View>
      </TransactionsProvider>
    </MonthProvider>
  );
}
