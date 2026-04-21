import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import api from '../services/api';

interface AuthContextType {
    token: string | null;
    isLoading: boolean;
    login: (token: string, refreshToken: string, userId: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const appStateRef = useRef(AppState.currentState);

    // Load stored token on mount
    useEffect(() => {
        async function loadToken() {
            try {
                const storedToken = await SecureStore.getItemAsync('token');
                if (storedToken) {
                    setToken(storedToken);
                }
            } catch (e) {
                console.error('[AuthContext] Erro ao carregar token:', e);
            } finally {
                setIsLoading(false);
            }
        }
        loadToken();

        let isLoggingOut = false;

        const authSubscription = DeviceEventEmitter.addListener('auth:unauthorized', async () => {
            if (isLoggingOut) return;
            isLoggingOut = true;
            console.log('[AuthContext] Sessão expirada ou 401 detectado. Deslogando...');
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('userId');
            setToken(null);
            router.replace('/');

            setTimeout(() => {
                isLoggingOut = false;
            }, 1000);
        });

        return () => authSubscription.remove();
    }, []);

    // Proactive token refresh when app comes back from background
    useEffect(() => {
        const handleAppState = async (nextState: AppStateStatus) => {
            const wasBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive';
            const becameActive = nextState === 'active';

            appStateRef.current = nextState;

            if (wasBackground && becameActive) {
                console.log('[AuthContext] App voltou do background. Verificando token...');
                try {
                    const storedToken = await SecureStore.getItemAsync('token');
                    if (!storedToken) return;

                    // Try to refresh the access token proactively
                    const refreshToken = await SecureStore.getItemAsync('refreshToken');
                    const userId = await SecureStore.getItemAsync('userId');

                    if (!refreshToken || !userId) return;

                    // Use raw axios to avoid interceptor loop
                    const axios = require('axios');
                    const API_URL = 'https://api.finanzaai.tech/v1';
                    
                    const response = await axios.post(`${API_URL}/auth/refresh`, {
                        userId,
                        refreshToken
                    });

                    const newAccess = response.data?.access_token || response.data?.data?.access_token;
                    const newRefresh = response.data?.refreshToken || response.data?.data?.refreshToken;

                    if (newAccess) {
                        await SecureStore.setItemAsync('token', newAccess);
                        if (newRefresh) {
                            await SecureStore.setItemAsync('refreshToken', newRefresh);
                        }
                        setToken(newAccess);
                        console.log('[AuthContext] Token refresh proativo com sucesso!');
                    }
                } catch (e: any) {
                    // If refresh token is also expired (7 days), then logout
                    if (e?.response?.status === 401 || e?.response?.status === 403) {
                        console.log('[AuthContext] Refresh token expirado. Sessão encerrada.');
                        DeviceEventEmitter.emit('auth:unauthorized');
                    } else {
                        // Network error etc — don't logout, just log
                        console.warn('[AuthContext] Refresh proativo falhou (rede?). Continuando com token atual:', e?.message);
                    }
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppState);
        return () => subscription.remove();
    }, []);

    const login = React.useCallback(async (newToken: string, newRefreshToken: string, newUserId: string) => {
        console.log('[AuthContext] Fazendo login guardando múltiplos tokens...');
        await SecureStore.setItemAsync('token', newToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        await SecureStore.setItemAsync('userId', newUserId);
        setToken(newToken);
    }, []);

    const logout = React.useCallback(async () => {
        console.log('[AuthContext] Iniciando logout manual...');
        try {
            await api.post('/auth/logout');
        } catch (e) {
            console.warn('[AuthContext] Backend erro ao logar nativo, limpando store mesmo assim:', e);
        }
        await SecureStore.deleteItemAsync('token');
        await SecureStore.deleteItemAsync('refreshToken');
        await SecureStore.deleteItemAsync('userId');
        setToken(null);
        router.replace('/');
    }, []);

    const value = React.useMemo(() => ({
        token, isLoading, login, logout
    }), [token, isLoading, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};