import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../context/NetworkContext';
import { useLanguage } from '../context/LanguageContext';

export function OfflineBanner() {
  const { isOnline, lastChangedAt } = useNetworkStatus();
  const { locale, t } = useLanguage();

  if (isOnline) return null;

  const lastChangedText = lastChangedAt
    ? ` • ${t('offline.lastChanged', {
        time: new Date(lastChangedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      })}`
    : '';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('offline.title')}</Text>
      <Text style={styles.subtitle}>
        {t('offline.subtitle')}{lastChangedText}
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
