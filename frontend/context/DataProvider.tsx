import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import api from '../services/api';
import { Transaction, Budget, Account, CreditCard } from '../types';
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
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { addToast } = useToast();
    // We remove useMonth logic here if backend summary also needs to be re-fetched on month change
    // Actually, yes! We should refetch the summary when month changes!
    const { selectedDate } = useMonth();

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        try {
            const year = selectedDate.getFullYear();
            const month = selectedDate.getMonth();

            // Fetch summary focusing on the selected month
            const [txRes, bRes, accRes, ccRes, summaryRes] = await Promise.all([
                api.get<Transaction[]>('/transactions'),
                api.get<Budget[]>('/budgets'),
                api.get<Account[]>('/accounts'),
                api.get<CreditCard[]>('/credit-cards'),
                api.get<DashboardSummary>(`/transactions/dashboard-summary?year=${year}&month=${month}`)
            ]);

            setTransactions(txRes.data);
            setBudgets(bRes.data);
            setAccounts(accRes.data);
            setCreditCards(ccRes.data);
            setDashboardSummary(summaryRes.data);
        } catch (error: any) {
            console.error('Data fetch error:', error);
            if (error.response?.status !== 401) {
                addToast('Erro ao carregar dados. Verifique a conexão com o backend.', 'error');
            }
        } finally {
            setIsLoading(false);
        }
    }, [selectedDate, addToast]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

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
            transactions, accounts, creditCards, budgets, dashboardSummary,
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
