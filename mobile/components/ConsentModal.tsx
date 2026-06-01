import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'finanza_cookie_consent';

export const ConsentModal: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const consent = await AsyncStorage.getItem(STORAGE_KEY);
      if (!consent) {
        setVisible(true);
      }
    })();
  }, []);

  const handleAccept = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, ts: Date.now() }));
    setVisible(false);
  };

  const handleDecline = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: false, ts: Date.now() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white dark:bg-slate-900 rounded-t-3xl p-6 pb-8 mx-1">
          <Text className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            🍪 Seus dados, sua escolha
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-5">
            Utilizamos dados essenciais para autenticação e segurança do app. Não utilizamos rastreamento ou publicidade.
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://finanzaai.tech/legal/privacy.html')}
            className="mb-4"
          >
            <Text className="text-indigo-600 dark:text-indigo-400 text-sm underline">
              Política de Privacidade
            </Text>
          </TouchableOpacity>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleDecline}
              className="flex-1 py-3 rounded-2xl border border-gray-300 dark:border-gray-600"
            >
              <Text className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400">
                Recusar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAccept}
              className="flex-1 py-3 rounded-2xl bg-indigo-600"
            >
              <Text className="text-center text-sm font-semibold text-white">
                Aceitar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};