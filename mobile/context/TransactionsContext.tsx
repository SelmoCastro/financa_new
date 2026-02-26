import React, { createContext, useState, useContext, useCallback, useEffect, ReactNode } from 'react';
import { Transaction } from '../types';
import api from '../services/api';
import { useAuth } from './AuthContext';

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

    const fetchTransactions = useCallback(async () => {
        try {
            setError(null);
            const response = await api.get('/transactions');
            setTransactions(response.data);
        } catch (err) {
            console.error(err);
            setError('Falha ao carregar transações');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTransactions();
    }, [fetchTransactions]);

    const togglePrivacy = useCallback(() => {
        setIsPrivacyEnabled(prev => !prev);
    }, []);

    // Initial fetch
    useEffect(() => {
        if (token) {
            fetchTransactions();
        }
    }, [token]);

    return (
        <TransactionsContext.Provider
            value={{
                transactions,
                loading,
                refreshing,
                error,
                isPrivacyEnabled,
                fetchTransactions,
                onRefresh,
                setTransactions,
                togglePrivacy
            }}
        >
            {children}
        </TransactionsContext.Provider>
    );
};

export const useTransactionsContext = () => useContext(TransactionsContext);
