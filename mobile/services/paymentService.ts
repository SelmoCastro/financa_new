import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';
import api from './api';

export type PlanId = 'premium_monthly' | 'premium_quarterly' | 'premium_semiannual' | 'premium_annual';

export async function openCheckout(plan: PlanId = 'premium_monthly') {
  try {
    const response = await api.post('/payments/create-preference', { plan });
    const { initPoint } = response.data;
    if (initPoint) {
      await WebBrowser.openBrowserAsync(initPoint);
    } else {
      Alert.alert('Erro', 'Não foi possível iniciar o checkout.');
    }
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || 'Erro ao criar checkout.';
    Alert.alert('Erro', msg);
  }
}
