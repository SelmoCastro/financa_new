import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { Transaction, Budget, Account, CreditCard, Category } from '../types';
import { useToast } from './ToastContext';
import { useMonth } from './MonthContext';

interface DashboardSummary {
    balance: number;
    currentMonth: {
        income: number;
        expense: number;
        incomeTrend: number;
        expenseTrend: number;
    };
    rule503020: {
        needs: { value: number; percent: number };
        wants: { value: number; percent: number };
        savings: { value: number; percent: number };
    };
    categorySummary: Array<{ name: string, value: number }>;
    monthlyHistory: Array<{ month: string, income: number, expenses: number }>;
}

interface DataContextType {
    transactions: Transaction[];
    accounts: Account[];
    creditCards: CreditCard[];
    categories: Category[];
    budgets: Budget[];
    dashboardSummary: DashboardSummary | null;
    isLoading: boolean;
    refreshData: () => Promise<void>;
    addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
    updateTransaction: (tx: Transaction) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { addToast } = useToast();
    const { selectedDate } = useMonth();

    // Fetch 1: All base data — now with independent error handling
    const fetchBaseData = useCallback(async () => {
        const fetchResource = async (url: string, setter: (data: any) => void) => {
            try {
                const res = await api.get(url);
                setter(res.data);
            } catch (error: any) {
                console.error(`Error fetching ${url}:`, error);
                // 401 is handled by interceptors or App.tsx redirect logic
                if (error.response?.status !== 401) {
                    addToast(`Erro ao sincronizar ${url.replace('/', '')}.`, 'error');
                }
            }
        };

        try {
            await Promise.all([
                fetchResource('/transactions', setTransactions),
                fetchResource('/budgets', setBudgets),
                fetchResource('/accounts', setAccounts),
                fetchResource('/credit-cards', setCreditCards),
                fetchResource('/categories', setCategories),
            ]);
        } catch (error) {
            console.error('Base data fetch error:', error);
        }
    }, [addToast]);

    // Fetch 2: Dashboard summary — re-fetches on EVERY selectedDate change
    const fetchDashboardSummary = useCallback(async (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        try {
            const summaryRes = await api.get<DashboardSummary>(
                `/transactions/dashboard-summary?year=${year}&month=${month}&_t=${Date.now()}`
            );
            setDashboardSummary(summaryRes.data);
        } catch (error: any) {
            console.error('Dashboard summary fetch error:', error);
        }
    }, []);

    // Initial load on mount
    useEffect(() => {
        let isMounted = true;
        const init = async () => {
            setIsLoading(true);
            try {
                // Fetch sequentially to prevent token-refresh race conditions 
                // when waking up a sleeping backend / expired token session
                await fetchBaseData();
                if (isMounted) await fetchDashboardSummary(selectedDate);
            } catch (err) {
                console.error('Error during initial fetch:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };
        init();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-fetch summary whenever the user switches months
    useEffect(() => {
        fetchDashboardSummary(selectedDate);
    }, [selectedDate, fetchDashboardSummary]);

    // Manual full refresh (e.g. after adding a transaction)
    const refreshData = useCallback(async () => {
        try {
            await fetchBaseData();
            await fetchDashboardSummary(selectedDate);
        } catch (err) {
            console.error('Error during refresh:', err);
        }
    }, [fetchBaseData, fetchDashboardSummary, selectedDate]);

    const addTransaction = async (newTx: Omit<Transaction, 'id'>) => {
        try {
            if (newTx.type === 'TRANSFER') {
                const transferPayload = {
                    sourceAccountId: newTx.accountId,
                    destinationAccountId: newTx.destinationAccountId,
                    amount: newTx.amount,
                    date: newTx.date,
                    description: newTx.description
                };
                await api.post('/transactions/transfer', transferPayload);
            } else {
                await api.post('/transactions', newTx);
            }
            await refreshData();
            addToast(newTx.type === 'TRANSFER' ? 'Transferência realizada com sucesso!' : 'Transação salva com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao adicionar:', error);
            addToast('Erro ao salvar transação', 'error');
        }
    };

    const updateTransaction = async (updatedTx: Transaction) => {
        try {
            const { id, ...data } = updatedTx;
            await api.patch(`/transactions/${id}`, data);
            await refreshData();
            addToast('Transação atualizada!', 'success');
        } catch (error) {
            console.error('Erro ao atualizar:', error);
            addToast('Erro ao atualizar transação', 'error');
        }
    };

    const deleteTransaction = async (id: string) => {
        try {
            await api.delete(`/transactions/${id}`);
            await refreshData();
            addToast('Transação excluída!', 'success');
        } catch (error) {
            console.error('Erro ao excluir:', error);
            addToast('Erro ao remover transação', 'error');
        }
    };

    return (
        <DataContext.Provider value={{
            transactions, accounts, creditCards, categories, budgets, dashboardSummary,
            isLoading, refreshData, addTransaction, updateTransaction, deleteTransaction
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
