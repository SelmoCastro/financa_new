import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { FixedItems } from './components/FixedItems';
import { useNavigate } from 'react-router-dom';
import { useFixedTransactions } from './hooks/useFixedTransactions';
import { DashboardView } from './views/DashboardView';
import { BudgetsView } from './views/BudgetsView';
import { GoalsView } from './views/GoalsView';
import { TimelineView } from './views/TimelineView';
import { HistoryView } from './views/HistoryView';
import { SettingsView } from './views/SettingsView';
import { AccountsView } from './views/AccountsView';
import { FeedbackAdminView } from './views/FeedbackAdminView';
import { ImportOverlay } from './components/ImportOverlay';
import { FeedbackModal } from './components/FeedbackModal';
import { ToastProvider, useToast } from './context/ToastContext';
import { MonthProvider, useMonth } from './context/MonthContext';
import { DataProvider, useData } from './context/DataProvider';
import { MonthSelector } from './components/MonthSelector';
import { Transaction } from './types';
import { TransactionForm } from './components/TransactionForm';
import { NotificationCenter } from './components/NotificationCenter';

import { getYearMonth } from './utils/dateUtils';
import { UploadCloud, Plus, ChevronLeft, ChevronRight, EyeOff, Eye, CheckSquare, Image, FileSpreadsheet } from 'lucide-react';
import api from './services/api';

const AppContent: React.FC = () => {
  const {
    transactions, accounts, creditCards, categories, dashboardSummary, isLoading, refreshData,
    addTransaction, updateTransaction, deleteTransaction
  } = useData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'Usuário');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [isAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { selectedDate } = useMonth();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data.user) {
          setUserName(res.data.user.name);
          setUserEmail(res.data.user.email);
          localStorage.setItem('userName', res.data.user.name);
          localStorage.setItem('userEmail', res.data.user.email);
        }
      } catch (err) {
        console.warn('Erro ao carregar perfil:', err);
      }
    };
    fetchProfile();
  }, []);

  const totals = useMemo(() => ({
    balance: dashboardSummary?.balance || 0,
    income: dashboardSummary?.currentMonth?.income || 0,
    expense: dashboardSummary?.currentMonth?.expense || 0,
    currentIncome: dashboardSummary?.currentMonth?.income || 0,
    currentExpense: dashboardSummary?.currentMonth?.expense || 0,
    incomeTrend: dashboardSummary?.currentMonth?.incomeTrend || 0,
    expenseTrend: dashboardSummary?.currentMonth?.expenseTrend || 0
  }), [dashboardSummary]);

  // Timeline, History e Budgets utilizam transações filtradas localmente.
  // O array `transactions` base tem todo o histórico para a Dashboard projetar Saldo e Gráficos corretamente.
  const monthFilteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    const { year: currentYear, month: currentMonth } = getYearMonth(selectedDate);
    return transactions.filter(t => {
      const { year: tYear, month: tMonth } = getYearMonth(t.date);
      return tYear === currentYear && tMonth === currentMonth;
    });
  }, [transactions, selectedDate]);

  const forecast = useFixedTransactions(transactions, totals, selectedDate);

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    await addTransaction(newTx);
    setIsFormOpen(false);
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    await updateTransaction(updatedTx);
    setEditingTransaction(null);
    setIsFormOpen(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      await deleteTransaction(id);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Backend logout falhou, forçando fechamento local', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('isAdmin');
    navigate('/login');
  };

  const openEditForm = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const handleOpenTransactionForm = () => {
    if (accounts.length === 0) {
      addToast('Crie primeiro uma Conta para poder realizar lançamentos financeiros!', 'error');
      setActiveTab('accounts');
    } else {
      setIsFormOpen(true);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView transactions={transactions} isPrivacyEnabled={isPrivacyEnabled} isLoading={isLoading} />;
      case 'accounts':
        return <AccountsView isPrivacyEnabled={isPrivacyEnabled} />;
      case 'budgets':
        return (
          <BudgetsView
            isPrivacyEnabled={isPrivacyEnabled}
          />
        );
      case 'goals':
        return <GoalsView isPrivacyEnabled={isPrivacyEnabled} />;
      case 'timeline':
        return <TimelineView transactions={monthFilteredTransactions} />;
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
            transactions={monthFilteredTransactions}
            isPrivacyEnabled={isPrivacyEnabled}
            onEdit={openEditForm}
            onDelete={handleDeleteTransaction}
          />
        );
      case 'feedbacks':
        return <FeedbackAdminView />;
      case 'settings':
        return <SettingsView userName={userName} transactions={transactions} onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} onOpenFeedback={() => setIsFeedbackOpen(true)} isAdmin={isAdmin} />
      <div className={`flex-1 sidebar-transition ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pb-24 lg:pb-0`}>
        <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 md:px-8 py-2 md:py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-2 w-full max-w-[100vw]">
          <div className="min-w-0 flex-1 w-full sm:w-auto">
            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 truncate">Gestão Financeira</p>
            <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight capitalize truncate flex items-center gap-3">
              {activeTab === 'dashboard' ? 'Dashboard' :
                activeTab === 'accounts' ? 'Contas & Cartões' :
                  activeTab === 'timeline' ? 'Linha do Tempo' :
                    activeTab === 'goals' ? 'Metas & Sonhos' :
                      activeTab === 'budgets' ? 'Orçamentos' :
                        activeTab === 'fixed' ? 'Controle Fixos' :
                          activeTab === 'feedbacks' ? 'Feedbacks (Admin)' :
                            activeTab === 'history' ? 'Extrato' :
                              'Configurações'}
              {userName && (
                <div className="flex flex-col border-l border-slate-200 pl-3">
                  <span className="text-[10px] text-indigo-600 font-bold leading-tight">Olá, {userName}</span>
                  {userEmail && <span className="text-[9px] text-slate-400 font-medium lowercase leading-tight">{userEmail}</span>}
                </div>
              )}
            </h2>
            {['dashboard', 'history', 'timeline', 'budgets'].includes(activeTab) && (
              <div className="mt-1.5 animate-in fade-in duration-300 relative z-[200]">
                <div className="flex items-center gap-3">
                  <MonthSelector />
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {Array.isArray(transactions) ? transactions.length : 0} transações
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-2 flex-wrap w-full sm:w-auto mt-1 sm:mt-0 relative z-50">
            <NotificationCenter />
            <button
              onClick={() => setIsPrivacyEnabled(!isPrivacyEnabled)}
              className="p-2 md:p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all active:scale-95"
              title={isPrivacyEnabled ? "Mostrar valores" : "Ocultar valores"}
            >
              {isPrivacyEnabled ? <EyeOff className="w-4 h-4 md:w-5 h-5" /> : <Eye className="w-4 h-4 md:w-5 h-5" />}
            </button>
            <button
              className="p-2 md:p-2.5 rounded-xl bg-slate-50 border border-transparent text-slate-500 hover:bg-slate-100 transition-all active:scale-95"
              onClick={() => setIsImportOpen(true)}
              title="Importar Extrato"
            >
              <UploadCloud className="w-4 h-4 md:w-5 h-5" />
            </button>
            <button onClick={handleOpenTransactionForm} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold text-[9px] md:text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2 flex-shrink-0">
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Gravar</span>
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
          onClose={() => {
            setIsFormOpen(false);
            setEditingTransaction(null);
          }}
          existingCategories={Array.isArray(transactions) ? Array.from(new Set(transactions.map(t => typeof t.category === 'object' && t.category !== null ? t.category.name : t.categoryLegacy || 'Outros'))).filter(Boolean) : []}
          editingTransaction={editingTransaction}
        />
      )}

      {isImportOpen && (
        <ImportOverlay
          onClose={() => setIsImportOpen(false)}
          onImportSuccess={() => {
            setIsImportOpen(false);
            refreshData();
            addToast('Extrato importado com sucesso!', 'success');
          }}
          accounts={accounts}
          creditCards={creditCards}
          categories={categories}
          existingTransactions={transactions}
        />
      )}

      {isFeedbackOpen && (
        <FeedbackModal onClose={() => setIsFeedbackOpen(false)} />
      )}

      {/* Floating Action Button (Mobile) */}
      {!isFormOpen && !isImportOpen && (
        <button
          onClick={handleOpenTransactionForm}
          className="fixed lg:hidden bottom-[100px] sm:bottom-[100px] right-4 md:right-8 z-50 bg-indigo-600 hover:bg-indigo-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-95 group"
          title="Novo Lançamento"
          style={{ boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.4)' }}
        >
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}

      {/* AI Assistant Chat */}

    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <MonthProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </MonthProvider>
    </ToastProvider>
  );
};

export default App;
