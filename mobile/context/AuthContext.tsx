import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { safeLog } from '../services/safeLog';
import { DeviceEventEmitter, AppState, AppStateStatus } from 'react-native';
import { router } from 'expo-router';
import api from '../services/api';
import { clearCurrentUserApiCache } from '../services/cache';
import { warmOfflineCache } from '../services/offlineWarmup';
import { useNetworkStatus } from './NetworkContext';
import { offlineTransactionQueue } from '../services/offlineTransactionQueue';
import { offlineRecurringQueue } from '../services/offlineRecurringQueue';
import { offlineBudgetQueue } from '../services/offlineBudgetQueue';
import { offlineGoalQueue } from '../services/offlineGoalQueue';

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
    const warmupDoneRef = useRef(false);
    const syncInFlightRef = useRef(false);
    const { isOnline } = useNetworkStatus();

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
            safeLog('[AuthContext] Erro ao buscar perfil', e);
        }
    }, []);

    // Load stored token on mount
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

                // Set token immediately so it's available for the poke request
                setToken(storedToken);

                // Poke the API. If access token is expired (15m), the interceptor in api.ts
                // will catch the 401, refresh using refreshToken (7d), and then resolve this call.
                // if it fails (refresh token expired), interceptor triggers logout event.
                await fetchProfile();
                if (!warmupDoneRef.current) {
                    warmupDoneRef.current = true;
                    warmOfflineCache().catch(() => {});
                }
            } catch (e) {
                safeLog('[AuthContext] Init profile fetch failed', e);
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        initialize();

        const authSubscription = DeviceEventEmitter.addListener('auth:unauthorized', () => {
            if (isLoggingOut) return;
            isLoggingOut = true;
            if (__DEV__) console.log('[AuthContext] Session expired. Logging out...');
            setToken(null);
            setUser(null);
            router.replace('/');

            clearCurrentUserApiCache().catch(() => {});
            SecureStore.deleteItemAsync('token').catch(() => {});
            SecureStore.deleteItemAsync('refreshToken').catch(() => {});
            SecureStore.deleteItemAsync('userId').catch(() => {});

            setTimeout(() => { isLoggingOut = false; }, 1000);
        });

        // Keep AuthContext in sync when the API interceptor refreshes tokens
        const tokenRefreshedSubscription = DeviceEventEmitter.addListener('auth:token-refreshed', (newToken: string) => {
            if (__DEV__) console.log('[AuthContext] Token refreshed via interceptor. Updating state...');
            setToken(newToken);
            fetchProfile().catch(() => {});
        });

        return () => {
            mounted = false;
            authSubscription.remove();
            tokenRefreshedSubscription.remove();
        };
    }, [fetchProfile]);

    // Refresh profile when app comes back from background (pokes the interceptor if needed)
    useEffect(() => {
        const handleAppState = async (nextState: AppStateStatus) => {
            const wasBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive';
            const becameActive = nextState === 'active';

            appStateRef.current = nextState;

            if (!wasBackground || !becameActive || !token) return;

            if (__DEV__) console.log('[AuthContext] App came back from background. Checking session...');
            // Poke the API. Interceptor handles 401 -> refresh if needed.
            await fetchProfile();

            // Re-tenta sincronizar filas offline ao voltar pro primeiro plano
            if (isOnline && !syncInFlightRef.current) {
                syncInFlightRef.current = true;
                Promise.all([
                    offlineTransactionQueue.syncPendingTransactionQueue(),
                    offlineRecurringQueue.syncPendingRecurringQueue(),
                    offlineBudgetQueue.syncPendingBudgetQueue(),
                    offlineGoalQueue.syncPendingGoalQueue(),
                ]).catch((error) => {
                    if (__DEV__) console.warn('[AuthContext] Erro ao sincronizar filas offline (foreground):', error);
                }).finally(() => {
                    syncInFlightRef.current = false;
                });
            }
        };

        const subscription = AppState.addEventListener('change', handleAppState);
        return () => subscription.remove();
    }, [token, fetchProfile]);

    const login = React.useCallback(async (newToken: string, newRefreshToken: string, newUserId: string) => {
        if (__DEV__) console.log('[AuthContext] Logging in...');
        await SecureStore.setItemAsync('token', newToken);
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
        await SecureStore.setItemAsync('userId', newUserId);
        setToken(newToken);
        setTimeout(() => {
            fetchProfile();
            if (!warmupDoneRef.current) {
                warmupDoneRef.current = true;
                warmOfflineCache().catch(() => {});
            }
        }, 200);
    }, [fetchProfile]);

    useEffect(() => {
        if (!token || !isOnline || syncInFlightRef.current) return;

        syncInFlightRef.current = true;
        Promise.all([
            offlineTransactionQueue.syncPendingTransactionQueue(),
            offlineRecurringQueue.syncPendingRecurringQueue(),
            offlineBudgetQueue.syncPendingBudgetQueue(),
            offlineGoalQueue.syncPendingGoalQueue(),
        ])
            .catch((error) => {
                if (__DEV__) console.warn('[AuthContext] Erro ao sincronizar filas offline:', error);
            })
            .finally(() => {
                syncInFlightRef.current = false;
            });
    }, [token, isOnline]);

    const logout = React.useCallback(async () => {
        if (__DEV__) console.log('[AuthContext] Logging out...');
        setToken(null);
        setUser(null);
        router.replace('/');

        await clearCurrentUserApiCache().catch(() => {});
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