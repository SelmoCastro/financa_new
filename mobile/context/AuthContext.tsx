import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import api from '../services/api';

const API_URL = 'https://api.finanzaai.tech/v1';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    plan: string;
    isEmailVerified: boolean;
}

interface AuthContextType {
    token: string | null;
    isLoading: boolean;
    user: UserProfile | null;
    login: (token: string, refreshToken: string, userId: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    updateUserName: (name: string) => void;
    updateUserEmail: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<UserProfile | null>(null);
    const appStateRef = useRef(AppState.currentState);

    const fetchProfile = useCallback(async () => {
        try {
            const response = await api.get('/auth/me');
            const userData = response.data?.user || response.data;
            if (userData) {
                setUser({
                    id: userData.id,
                    name: userData.name || '',
                    email: userData.email || '',
                    plan: userData.plan || 'free',
                    isEmailVerified: userData.isEmailVerified ?? false,
                });
            }
        } catch (e) {
            console.warn('[AuthContext] Erro ao buscar perfil:', e);
        }
    }, []);

    type RefreshResult = 'success' | 'unauthorized' | 'network_error';

    /**
     * Proactively refresh the access token using the stored refresh token.
     * Returns discriminated result so caller knows how to handle fallback.
     */
    const proactiveRefresh = useCallback(async (): Promise<RefreshResult> => {
        try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            const userId = await SecureStore.getItemAsync('userId');
            if (!refreshToken || !userId) return 'unauthorized';

            const axios = require('axios');
            const response = await axios.post(`${API_URL}/auth/refresh`, {
                userId,
                refreshToken,
            }, {
                headers: { 'x-platform': 'mobile' },
                timeout: 10000,
            });

            const newAccess = response.data?.access_token || response.data?.data?.access_token;
            const newRefresh = response.data?.refreshToken || response.data?.data?.refreshToken;

            if (!newAccess) return 'unauthorized';

            await SecureStore.setItemAsync('token', newAccess);
            if (newRefresh) {
                await SecureStore.setItemAsync('refreshToken', newRefresh);
            }
            setToken(newAccess);
            console.log('[AuthContext] Proactive refresh succeeded');
            return 'success';
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 401 || status === 403) {
                console.log('[AuthContext] Refresh token expired. Logging out.');
                await SecureStore.deleteItemAsync('token');
                await SecureStore.deleteItemAsync('refreshToken');
                await SecureStore.deleteItemAsync('userId');
                return 'unauthorized';
            }
            console.warn('[AuthContext] Proactive refresh network error:', e?.message);
            return 'network_error';
        }
    }, []);

    // Load stored token on mount — with proactive refresh if needed
    useEffect(() => {
        let mounted = true;
        let isLoggingOut = false;

        async function initialize() {
            try {
                const storedToken = await SecureStore.getItemAsync('token');
                if (!storedToken) {
                    if (mounted) setIsLoading(false);
                    return;
                }

                const result = await proactiveRefresh();

                if (!mounted) return;

                switch (result) {
                    case 'success':
                        // Token refreshed — profile already set by proactiveRefresh
                        await fetchProfile();
                        break;
                    case 'unauthorized':
                        // Refresh token expired — SecureStore already cleaned up
                        // Don't set token (it's invalid), let RootLayoutNav redirect to login
                        setToken(null);
                        break;
                    case 'network_error':
                        // Couldn't reach server — use stored token (might still be valid)
                        setToken(storedToken);
                        await fetchProfile().catch(() => {});
                        break;
                }
            } catch (e) {
                console.error('[AuthContext] Init error:', e);
                // Last resort — try with whatever token we have (network error fallback)
                const storedToken = await SecureStore.getItemAsync('token');
                if (storedToken && mounted) {
                    setToken(storedToken);
                    fetchProfile().catch(() => {});
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        initialize();

        const authSubscription = DeviceEventEmitter.addListener('auth:unauthorized', async () => {
            if (isLoggingOut) return;
            isLoggingOut = true;
            console.log('[AuthContext] Session expired. Logging out...');
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('userId');
            setToken(null);
            setUser(null);
            router.replace('/');

            setTimeout(() => { isLoggingOut = false; }, 1000);
        });

        // Keep AuthContext in sync when the API interceptor refreshes tokens
        const tokenRefreshedSubscription = DeviceEventEmitter.addListener('auth:token-refreshed', (newToken: string) => {
            console.log('[AuthContext] Token refreshed via interceptor. Updating state...');
            setToken(newToken);
            fetchProfile();
        });

        return () => {
            mounted = false;
            authSubscription.remove();
            tokenRefreshedSubscription.remove();
        };
    }, [fetchProfile, proactiveRefresh]);

    // Proactive token refresh when app comes back from background
    useEffect(() => {
        const handleAppState = async (nextState: AppStateStatus) => {
            const wasBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive';
            const becameActive = nextState === 'active';

            appStateRef.current = nextState;

            if (!wasBackground || !becameActive || !token) return;

            console.log('[AuthContext] App came back from background. Refreshing token...');
            const refreshed = await proactiveRefresh();
            if (refreshed) {
                // Token refreshed — re-fetch profile to get latest data (including plan)
                await fetchProfile();
            }
            // If refresh failed, the 401 interceptor will handle it on next request.
            // Don't logout on network errors — user can still see cached data.
        };

        const subscription = AppState.addEventListener('change', handleAppState);
        return () => subscription.remove();
    }, [token, proactiveRefresh, fetchProfile]);

    const login = React.useCallback(async (newToken: string, newRefreshToken: string, newUserId: string) => {
        console.log('[AuthContext] Logging in...');
        await SecureStore.setItemAsync('token', newToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        await SecureStore.setItemAsync('userId', newUserId);
        setToken(newToken);
        setTimeout(() => fetchProfile(), 200);
    }, [fetchProfile]);

    const logout = React.useCallback(async () => {
        console.log('[AuthContext] Logging out...');
        setToken(null);
        setUser(null);
        router.replace('/');

        SecureStore.deleteItemAsync('token').catch(() => {});
        SecureStore.deleteItemAsync('refreshToken').catch(() => {});
        SecureStore.deleteItemAsync('userId').catch(() => {});

        api.post('/auth/logout').catch((e) => {
            console.warn('[AuthContext] Backend logout error (expected):', e?.message);
        });
    }, []);

    const updateUserName = useCallback((name: string) => {
        setUser(prev => prev ? { ...prev, name } : null);
    }, []);

    const updateUserEmail = useCallback((email: string) => {
        setUser(prev => prev ? { ...prev, email, isEmailVerified: false } : null);
    }, []);

    const value = React.useMemo(() => ({
        token, isLoading, user, login, logout, refreshProfile: fetchProfile, updateUserName, updateUserEmail
    }), [token, isLoading, user, login, logout, fetchProfile, updateUserName, updateUserEmail]);

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