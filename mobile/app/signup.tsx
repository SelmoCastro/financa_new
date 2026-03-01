import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, Platform, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';

export default function SignupScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSignup = async () => {
        if (!email || !password || !name) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem');
            return;
        }

        const sanitizedEmail = email.trim().toLowerCase();
        const sanitizedPassword = password.trim();
        const sanitizedName = name.trim();

        setLoading(true);
        try {
            // 1. Register
            await api.post('/auth/register', {
                email: sanitizedEmail,
                password: sanitizedPassword,
                name: sanitizedName
            });

            // 2. Login automatically after registration
            const loginResponse = await api.post('/auth/login', {
                email: sanitizedEmail,
                password: sanitizedPassword
            });

            const { access_token } = loginResponse.data;
            if (access_token) {
                await login(access_token);
                // AuthContext will handle the redirect to /(tabs)
            } else {
                Alert.alert('Sucesso', 'Conta criada! Por favor, faça login.');
                router.replace('/');
            }
        } catch (error: any) {
            console.error('[Signup] Erro:', error.message || error);
            if (error.response?.data?.message) {
                Alert.alert('Erro', Array.isArray(error.response.data.message)
                    ? error.response.data.message[0]
                    : error.response.data.message);
            } else {
                Alert.alert('Erro', 'Não foi possível criar sua conta. Verifique os dados ou tente novamente mais tarde.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
            <View style={styles.container}>
                <View style={styles.card}>
                    <Pressable
                        onPress={() => router.back()}
                        style={styles.backButton}
                        android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: 20 }}
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#1e293b" />
                    </Pressable>

                    <Text style={styles.title}>Criar Conta</Text>
                    <Text style={styles.subtitle}>Comece a organizar suas finanças hoje</Text>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nome</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Seu nome completo"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

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
                            <Text style={styles.label}>Senha (mín. 6 caracteres)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirmar Senha</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                secureTextEntry
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                            />
                        </View>

                        <View style={[styles.buttonContainer, loading && styles.buttonDisabled]}>
                            <Pressable
                                style={styles.button}
                                android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    handleSignup();
                                }}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? 'Criando conta...' : 'Criar minha conta'}
                                </Text>
                            </Pressable>
                        </View>

                        <Pressable
                            onPress={() => router.replace('/')}
                            style={styles.loginLink}
                        >
                            <Text style={styles.loginLinkText}>
                                Já tem uma conta? <Text style={styles.loginLinkHighlight}>Entrar</Text>
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
    },
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
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        padding: 8,
        zIndex: 1,
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 8,
        textAlign: 'center',
        marginTop: 20,
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
        marginTop: 12,
        backgroundColor: '#4f46e5',
        elevation: 4,
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
    loginLink: {
        marginTop: 16,
        alignItems: 'center',
    },
    loginLinkText: {
        color: '#64748b',
        fontSize: 14,
    },
    loginLinkHighlight: {
        color: '#4f46e5',
        fontWeight: 'bold',
    },
});
