import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import { router } from 'expo-router';


interface AuthContextType {
    token: string | null;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
            setToken(null);

            // Allow state to reset before accepting new unauth events
            setTimeout(() => {
                isLoggingOut = false;
            }, 1000);
        });

        return () => authSubscription.remove();
    }, []);

    const login = async (newToken: string) => {
        console.log('[AuthContext] Fazendo login...');
        await SecureStore.setItemAsync('token', newToken);
        setToken(newToken);
    };

    const logout = async () => {
        console.log('[AuthContext] Iniciando logout manual...');
        await SecureStore.deleteItemAsync('token');
        setToken(null);
    };

    return (
        <AuthContext.Provider value={{ token, isLoading, login, logout }}>
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
