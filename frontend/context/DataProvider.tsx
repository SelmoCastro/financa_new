import axios from 'axios';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import api from '../services/api';
import { Transaction, Budget, Account, CreditCard, Category } from '../types';
import { useToast } from './ToastContext';
import { useMonth } from './MonthContext';

interface DashboardSummary {
    balance: number;
    creditCardDebt: number;
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
        uncategorized?: { value: number; percent: number };
    };
    categorySummary: Array<{ name: string, value: number }>;
    monthlyHistory: Array<{ month: string, income: number, expenses: number }>;
    pendingInvoices: Array<{
        id: string;
        creditCardName: string;
        referenceMonth: number;
        referenceYear: number;
        totalAmount: number;
        paidAmount: number;
        remaining: number;
        closingDate: string;
        dueDate: string;
    }>;
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

    // AbortController to cancel in-flight requests on unmount or rapid refresh
    const abortControllerRef = useRef<AbortController | null>(null);

    const isCanceledError = (error: any): boolean => {
        return axios.isCancel(error) || error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError' || error?.name === 'AbortError';
    };

    // Fetch 1: All base data — independent error handling per resource
    const fetchBaseData = useCallback(async (signal?: AbortSignal) => {
        const fetchResource = async (url: string, setter: (data: any) => void) => {
            try {
                const res = await api.get(url, { signal });
                const data = res.data;
                setter(Array.isArray(data) ? data : []);
            } catch (error: any) {
                // Don't show toast for aborted/canceled requests (page unload or rapid F5)
                if (isCanceledError(error)) return;
                console.error(`Error fetching ${url}:`, error?.response?.status, error?.message);
                setter([]);
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
            if (isCanceledError(error)) return;
            console.error('Base data fetch error:', error);
        }
    }, [addToast]);

    // Fetch 2: Dashboard summary — re-fetches on EVERY selectedDate change
    const fetchDashboardSummary = useCallback(async (date: Date, signal?: AbortSignal) => {
        const year = date.getFullYear();
        const month = date.getMonth(); // 0-indexed
        try {
            const summaryRes = await api.get<DashboardSummary>(
                `/transactions/dashboard-summary?year=${year}&month=${month}&_t=${Date.now()}`,
                { signal }
            );
            setDashboardSummary(summaryRes.data);
        } catch (error: any) {
            if (isCanceledError(error)) return;
            console.error('Dashboard summary fetch error:', error);
        }
    }, []);

    // Initial load on mount
    useEffect(() => {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const init = async () => {
            setIsLoading(true);
            try {
                await fetchBaseData(controller.signal);
                await fetchDashboardSummary(selectedDate, controller.signal);
            } catch (err) {
                if (isCanceledError(err)) return;
                console.error('Error during initial fetch:', err);
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                }
            }
        };
        init();

        // Cancel all in-flight requests on unmount (page refresh, navigation)
        return () => {
            controller.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-fetch summary whenever the user switches months
    useEffect(() => {
        const controller = new AbortController();
        fetchDashboardSummary(selectedDate, controller.signal);
        return () => { controller.abort(); };
    }, [selectedDate, fetchDashboardSummary]);

    // Manual full refresh (e.g. after adding a transaction)
    const refreshData = useCallback(async () => {
        // Cancel any previous in-flight requests
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            await fetchBaseData(controller.signal);
            await fetchDashboardSummary(selectedDate, controller.signal);
        } catch (err) {
            if (isCanceledError(err)) return;
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