import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator, MaterialTopTabNavigationOptions, MaterialTopTabNavigationEventMap } from '@react-navigation/material-top-tabs';
import { ParamListBase, TabNavigationState } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Platform } from 'react-native';

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <MaterialTopTabs
      tabBarPosition="bottom"
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9', // slate-100
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
          height: 60 + (Platform.OS === 'ios' ? insets.bottom : 10), // Increased height to avoid truncation
          elevation: 0, // Remove shadow for cleaner look
          shadowOpacity: 0,
        },
        tabBarIndicatorStyle: {
          backgroundColor: '#4f46e5', // INDIGO-600
          height: 3,
          top: 0
        },

        tabBarShowIcon: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: {
          fontSize: 9, // Slightly smaller font to fit text
          fontWeight: '700',
          textTransform: 'capitalize',
          marginTop: 0,
        },
        swipeEnabled: true,
        animationEnabled: true,
      }}
    >
      <MaterialTopTabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="grid-view" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="transactions"
        options={{
          title: 'Extrato',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="receipt-long" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="budgets"
        options={{
          title: 'Orçamentos', // Full name
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="pie-chart" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="goals"
        options={{
          title: 'Metas',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="track-changes" size={24} color={color} />,
        }}
      />
      <MaterialTopTabs.Screen
        name="fixed"
        options={{
          title: 'Fixos',
          tabBarIcon: ({ color }: { color: string }) => <MaterialIcons name="event-repeat" size={24} color={color} />,
        }}
      />
    </MaterialTopTabs>
  );
}
