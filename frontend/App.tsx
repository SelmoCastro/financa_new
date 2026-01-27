
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction } from './types';
import { TransactionForm } from './components/TransactionForm';
import { Sidebar } from './components/Sidebar';
import { FixedItems } from './components/FixedItems';
import api from './services/api';
import { useNavigate } from 'react-router-dom';
import { useFixedTransactions } from './hooks/useFixedTransactions';
import { DashboardView } from './views/DashboardView';
import { TimelineView } from './views/TimelineView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { ToastProvider, useToast } from './context/ToastContext';

const AppContent: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'Usuário');
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      setTransactions(response.data);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      if ((error as any).response?.status === 401) {
        navigate('/login');
      } else {
        addToast('Erro ao carregar dados.', 'error');
      }
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // @ts-ignore
    if (window.lucide) {
      // @ts-ignore
      window.lucide.createIcons();
    }
  }, [activeTab, sidebarOpen, isFormOpen, transactions, editingTransaction, userName]);

  // Calculate totals for use in FixedItems hook logic if needed here, 
  // but useFixedTransactions calculates forecast internally if we pass totals. 
  // Current hook implementation expects 'totals' input. 
  // IMPORTANT: We need minimal totals here just for the hook.
  // Actually, we can duplicate the basic total calculation or refactor the hook later. 
  // For now, let's keep the basic total calc to satisfy the hook dependency if needed by FixedItems tab.
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(t => {
      if (t.type === 'INCOME') income += Number(t.amount);
      else expense += Number(t.amount);
    });
    return { income, expense, balance: income - expense, currentIncome: 0, currentExpense: 0, incomeTrend: 0, expenseTrend: 0 };
  }, [transactions]);

  const forecast = useFixedTransactions(transactions, totals);

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    try {
      const response = await api.post('/transactions', newTx);
      setTransactions(prev => [response.data, ...prev]);
      setIsFormOpen(false);
      addToast('Transação salva com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      addToast('Erro ao salvar transação', 'error');
    }
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    try {
      const { id, ...data } = updatedTx;
      await api.patch(`/transactions/${id}`, data);
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      setEditingTransaction(null);
      setIsFormOpen(false);
      addToast('Transação atualizada!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      addToast('Erro ao atualizar transação', 'error');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      try {
        await api.delete(`/transactions/${id}`);
        setTransactions(prev => prev.filter(t => t.id !== id));
        addToast('Transação removida.', 'info');
      } catch (error) {
        console.error('Erro ao deletar:', error);
        addToast('Erro ao deletar transação', 'error');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  const openEditForm = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView transactions={transactions} isPrivacyEnabled={isPrivacyEnabled} />;
      case 'timeline':
        return <TimelineView transactions={transactions} />;
      case 'recent': // Renamed visually to 'history' in code but tab ID is legacy
        return (
          <HistoryView
            transactions={transactions}
            isPrivacyEnabled={isPrivacyEnabled}
            onEdit={openEditForm}
            onDelete={handleDeleteTransaction}
          />
        );
      case 'fixed':
        return (
          <FixedItems
            items={forecast.fixedItems}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            transactions={transactions}
          />
        );
      case 'history':
        return (
          <HistoryView
            transactions={transactions}
            isPrivacyEnabled={isPrivacyEnabled}
            onEdit={openEditForm}
            onDelete={handleDeleteTransaction}
          />
        );
      case 'settings':
        return <SettingsView userName={userName} transactions={transactions} onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 sidebar-transition ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pb-24 lg:pb-0`}>
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center">
          <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 truncate">Gestão Financeira</p>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight capitalize truncate">
              {activeTab === 'dashboard' ? 'Dashboard' :
                activeTab === 'timeline' ? 'Linha do Tempo' :
                  activeTab === 'recent' ? 'Lançamentos' :
                    activeTab === 'fixed' ? 'Controle Fixos' :
                      activeTab === 'history' ? 'Extrato' : 'Configurações'}
              {userName && (
                <span className="block text-xs text-indigo-600 font-bold mt-1">Olá, {userName}</span>
              )}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrivacyEnabled(!isPrivacyEnabled)}
              className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all active:scale-95"
              title={isPrivacyEnabled ? "Mostrar valores" : "Ocultar valores"}
            >
              <i data-lucide={isPrivacyEnabled ? "eye-off" : "eye"} className="w-5 h-5"></i>
            </button>
            <button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-2 md:gap-3 flex-shrink-0">
              <i data-lucide="plus" className="w-4 h-4 md:w-5 md:h-5"></i>
              <span className="hidden sm:inline">Novo Lançamento</span>
            </button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 md:py-10">
          {renderContent()}
        </main>
      </div>

      {isFormOpen && (
        <TransactionForm
          onAdd={handleAddTransaction}
          onUpdate={handleUpdateTransaction}
          onClose={() => { setIsFormOpen(false); setEditingTransaction(null); }}
          existingCategories={Array.from(new Set(transactions.map(t => t.category)))}
          editingTransaction={editingTransaction}
        />
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
