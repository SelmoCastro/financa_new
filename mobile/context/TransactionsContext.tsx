import React, { createContext, useState, useContext, useCallback, useEffect, ReactNode } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { Transaction } from '../types';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { offlineTransactionQueue } from '../services/offlineTransactionQueue';

interface TransactionsContextData {
    transactions: Transaction[];
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    isPrivacyEnabled: boolean;
    fetchTransactions: () => Promise<void>;
    onRefresh: () => Promise<void>;
    setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
    togglePrivacy: () => void;
}

const TransactionsContext = createContext<TransactionsContextData>({} as TransactionsContextData);

export const TransactionsProvider = ({ children }: { children: ReactNode }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
    const { token } = useAuth();

    const mergePendingTransactions = useCallback((base: Transaction[], pending: Transaction[]) => {
        if (pending.length === 0) return base;

        const pendingIds = new Set(pending.map((item) => item.id));
        const pendingOfflineIds = new Set(pending.map((item) => item.offlineLocalId).filter(Boolean));

        return [
            ...pending,
            ...base.filter((item) => {
                if (pendingIds.has(item.id)) return false;
                if (item.offlineLocalId && pendingOfflineIds.has(item.offlineLocalId)) return false;
                return true;
            }),
        ];
    }, []);

    const fetchTransactions = useCallback(async () => {
        try {
            setError(null);
            const [response, pendingTransactions] = await Promise.all([
                api.get('/transactions'),
                offlineTransactionQueue.getPendingOptimisticTransactions(),
            ]);
            setTransactions(mergePendingTransactions(response.data, pendingTransactions));
        } catch (err) {
            console.error(err);
            setError('Falha ao carregar transações');

            try {
                const pendingTransactions = await offlineTransactionQueue.getPendingOptimisticTransactions();
                if (pendingTransactions.length > 0) {
                    setTransactions((prev) => mergePendingTransactions(prev, pendingTransactions));
                }
            } catch {
                // Mantém o estado atual se até a leitura local falhar.
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [mergePendingTransactions]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTransactions();
    }, [fetchTransactions]);

    const togglePrivacy = useCallback(() => {
        setIsPrivacyEnabled(prev => !prev);
    }, []);

    // Fetch when token changes (initial load + token refresh)
    useEffect(() => {
        if (token) {
            // Reset loading state on token change so UI shows skeletons
            setLoading(true);
            fetchTransactions();
        } else {
            // No token = logged out, clear data
            setTransactions([]);
            setLoading(false);
        }
    }, [token, fetchTransactions]);

    // Also listen for explicit token-refreshed events (from 401 interceptor)
    // This handles cases where setToken was already called but the effect
    // above may not re-fire if the token value didn't actually change string
    useEffect(() => {
        const sub = DeviceEventEmitter.addListener('auth:token-refreshed', () => {
            fetchTransactions();
        });
        return () => sub.remove();
    }, [fetchTransactions]);

    useEffect(() => {
        const sub = DeviceEventEmitter.addListener(offlineTransactionQueue.syncEvent, () => {
            fetchTransactions();
        });
        return () => sub.remove();
    }, [fetchTransactions]);

    const value = React.useMemo(() => ({
        transactions,
        loading,
        refreshing,
        error,
        isPrivacyEnabled,
        fetchTransactions,
        onRefresh,
        setTransactions,
        togglePrivacy
    }), [transactions, loading, refreshing, error, isPrivacyEnabled, fetchTransactions, onRefresh, togglePrivacy]);

    return (
        <TransactionsContext.Provider value={value}>
            {children}
        </TransactionsContext.Provider>
    );
};

export const useTransactionsContext = () => useContext(TransactionsContext);
