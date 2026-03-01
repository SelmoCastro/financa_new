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
    };
    rule503020: {
        needs: { value: number; percent: number };
        wants: { value: number; percent: number };
        savings: { value: number; percent: number };
    };
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

    // Fetch 1: All base data — only on mount or manual refresh
    const fetchBaseData = useCallback(async () => {
        try {
            const [txRes, bRes, accRes, ccRes, catRes] = await Promise.all([
                api.get<Transaction[]>('/transactions'),
                api.get<Budget[]>('/budgets'),
                api.get<Account[]>('/accounts'),
                api.get<CreditCard[]>('/credit-cards'),
                api.get<Category[]>('/categories'),
            ]);
            setTransactions(txRes.data);
            setBudgets(bRes.data);
            setAccounts(accRes.data);
            setCreditCards(ccRes.data);
            setCategories(catRes.data);
        } catch (error: any) {
            console.error('Base data fetch error:', error);
            if (error.response?.status !== 401) {
                addToast('Erro ao carregar dados. Verifique a conexão com o backend.', 'error');
            }
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
        const init = async () => {
            setIsLoading(true);
            await Promise.all([
                fetchBaseData(),
                fetchDashboardSummary(selectedDate),
            ]);
            setIsLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-fetch summary whenever the user switches months
    useEffect(() => {
        fetchDashboardSummary(selectedDate);
    }, [selectedDate, fetchDashboardSummary]);

    // Manual full refresh (e.g. after adding a transaction)
    const refreshData = useCallback(async () => {
        await Promise.all([
            fetchBaseData(),
            fetchDashboardSummary(selectedDate),
        ]);
    }, [fetchBaseData, fetchDashboardSummary, selectedDate]);

    const addTransaction = async (newTx: Omit<Transaction, 'id'>) => {
        try {
            await api.post('/transactions', newTx);
            await refreshData();
            addToast('Transação salva com sucesso!', 'success');
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
