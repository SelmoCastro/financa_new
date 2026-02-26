import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    console.log('[LoginScreen] Componente renderizado. Loading:', loading);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos');
            return;
        }

        const sanitizedEmail = email.trim().toLowerCase();
        const sanitizedPassword = password.trim();

        console.log('[Login] Iniciando tentativa de login para:', sanitizedEmail);
        setLoading(true);
        try {
            console.log('[Login] Fazendo POST para /auth/login...');
            const response = await api.post('/auth/login', {
                email: sanitizedEmail,
                password: sanitizedPassword
            });
            console.log('[Login] Resposta recebida:', JSON.stringify(response.data, null, 2));

            const data = response.data;
            const access_token = data.access_token;

            if (!access_token) {
                console.error('[Login] access_token não encontrado na resposta!');
                throw new Error('access_token missing');
            }

            // Desmarcar loading ANTES do redirect para evitar conflito de estado
            setLoading(false);
            console.log('[Login] Chamando login() no contexto...');
            await login(access_token);
        } catch (error: any) {
            console.error('[Login] Erro detectado:', error.message || error);
            if (error.response) {
                console.error('[Login] Detalhes do erro (Data):', JSON.stringify(error.response.data, null, 2));
                console.error('[Login] Status do erro:', error.response.status);
                Alert.alert('Erro', 'Falha no login. Verifique suas credenciais.');
            } else {
                console.error('[Login] Erro de rede ou servidor inacessível');
                Alert.alert('Erro de Rede', 'Não foi possível conectar ao servidor. Verifique sua internet ou se o backend está rodando.');
            }
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>
                    Finança Pro
                </Text>
                <Text style={styles.subtitle}>
                    Seu dinheiro sob controle
                </Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="seu@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Senha</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>

                    <View style={[styles.buttonContainer, loading && styles.buttonDisabled]}>
                        <Pressable
                            style={styles.button}
                            android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                            onPress={() => {
                                console.log('[LoginScreen] Botão entrar pressionado');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                handleLogin();
                            }}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading ? 'Entrando...' : 'Entrar'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        padding: 24,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'white',
        padding: 32,
        borderRadius: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        color: '#64748b',
        marginBottom: 32,
        textAlign: 'center',
        fontSize: 16,
    },
    form: {
        gap: 16,
    },
    inputGroup: {
        gap: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
        marginBottom: 4,
    },
    input: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#1e293b',
        fontSize: 16,
    },
    buttonContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 24,
        backgroundColor: '#4f46e5',
        ...Platform.select({
            ios: {
                shadowColor: '#4f46e5',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    button: {
        width: '100%',
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
});
