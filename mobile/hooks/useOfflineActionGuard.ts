import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNetworkStatus } from '../context/NetworkContext';

export function useOfflineActionGuard() {
  const { isOnline } = useNetworkStatus();

  const ensureOnline = useCallback((actionLabel: string, detail?: string) => {
    if (isOnline) return true;

    Alert.alert(
      'Sem internet',
      detail || `Conecte-se à internet para ${actionLabel}. Você ainda pode visualizar os dados salvos localmente.`,
      [{ text: 'OK' }]
    );
    return false;
  }, [isOnline]);

  return { isOnline, ensureOnline };
}
