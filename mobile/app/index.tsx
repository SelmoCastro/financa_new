import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos');
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/auth/login', { email, password });
            const { access_token } = response.data;

            await login(access_token);
        } catch (error: any) {
            console.error(error);
            Alert.alert('Erro', 'Falha no login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 justify-center items-center bg-slate-50 p-6">
            <View className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg">
                <Text className="text-3xl font-bold text-slate-800 mb-2 text-center">
                    Finança Pro
                </Text>
                <Text className="text-slate-500 mb-8 text-center">
                    Seu dinheiro sob controle
                </Text>

                <View className="space-y-4">
                    <View>
                        <Text className="text-sm font-medium text-slate-700 mb-1">Email</Text>
                        <TextInput
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                            placeholder="seu@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View>
                        <Text className="text-sm font-medium text-slate-700 mb-1">Senha</Text>
                        <TextInput
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900"
                            placeholder="••••••••"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <TouchableOpacity
                        className={`w-full bg-indigo-600 py-4 rounded-xl mt-6 ${loading ? 'opacity-70' : ''}`}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text className="text-white text-center font-bold text-lg">
                            {loading ? 'Entrando...' : 'Entrar'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}
