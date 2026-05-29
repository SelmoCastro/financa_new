import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../context/NetworkContext';

export function OfflineBanner() {
  const { isOnline, lastChangedAt } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sem internet</Text>
      <Text style={styles.subtitle}>
        Exibindo dados salvos{lastChangedAt ? ` • última mudança ${new Date(lastChangedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#334155',
  },
  title: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#cbd5e1',
    marginTop: 2,
    fontSize: 12,
  },
});
