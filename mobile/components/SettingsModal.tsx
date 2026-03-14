import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { currency, setCurrency } = useCurrency();
  const { logout } = useAuth();

  const currencies = [
    { label: 'Real (BRL)', value: 'BRL', icon: 'payments' },
    { label: 'Dólar (USD)', value: 'USD', icon: 'attach-money' },
    { label: 'Euro (EUR)', value: 'EUR', icon: 'euro' },
  ] as const;

  const handleSelectCurrency = (value: 'BRL' | 'USD' | 'EUR') => {
    setCurrency(value);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Configurações</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Moeda Preferencial</Text>
            {currencies.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.option,
                  currency === item.value && styles.optionSelected,
                ]}
                onPress={() => handleSelectCurrency(item.value)}
              >
                <View style={styles.optionLeft}>
                  <MaterialIcons
                    name={item.icon as any}
                    size={20}
                    color={currency === item.value ? '#4f46e5' : '#64748b'}
                  />
                  <Text
                    style={[
                      styles.optionLabel,
                      currency === item.value && styles.optionLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
                {currency === item.value && (
                  <MaterialIcons name="check" size={20} color="#4f46e5" />
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <MaterialIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>Sair da Conta</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  optionSelected: {
    borderColor: '#e0e7ff',
    backgroundColor: '#f5f7ff',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: 16,
    color: '#475569',
    marginLeft: 12,
  },
  optionLabelSelected: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
    marginLeft: 8,
  },
});
