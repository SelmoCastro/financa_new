import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { DashboardView } from './views/DashboardView';
import { BudgetsView } from './views/BudgetsView';
import { GoalsView } from './views/GoalsView';
import { TimelineView } from './views/TimelineView';
import { HistoryView } from './views/HistoryView';
import { RecurringView } from './views/RecurringView';
import { SettingsView } from './views/SettingsView';
import { AccountsView } from './views/accounts/AccountsView';
import { FeedbackAdminView } from './views/FeedbackAdminView';
import { AdminPanelView } from './views/admin/AdminView';
import { ImportOverlay } from './components/ImportOverlay';
import { FeedbackModal } from './components/FeedbackModal';
import { ActionMenu } from './components/ActionMenu';
import { ToastProvider, useToast } from './context/ToastContext';
import { MonthProvider, useMonth } from './context/MonthContext';
import { DataProvider, useData } from './context/DataProvider';
import { CurrencyProvider } from './context/CurrencyContext';
import { MonthSelector } from './components/MonthSelector';
import { Transaction } from './types';
import { TransactionForm } from './components/TransactionForm';
import { NotificationCenter } from './components/NotificationCenter';
import { motion, AnimatePresence } from 'framer-motion';

import { getYearMonth } from './utils/dateUtils';
import { Plus } from 'lucide-react';
import api from './services/api';
import { Mail } from 'lucide-react';
import { SmartBanner } from './components/SmartBanner';

const AppContent: React.FC = () => {
  const {
    transactions, accounts, creditCards, categories, dashboardSummary, isLoading, refreshData,
    addTransaction, updateTransaction, deleteTransaction
  } = useData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  // Source of truth: /auth/me — sem localStorage para dados sensíveis
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [showVerifyBanner, setShowVerifyBanner] = useState(true);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState('Usuário');
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  // Theme é a única coisa que permanece em localStorage (preferência de UI, não segurança)
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches));
  
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { selectedDate } = useMonth();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Busca perfil via /auth/me — source of truth para isAdmin, email, isEmailVerified, etc.
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data.user) {
          setUserName(res.data.user.name || 'Usuário');
          setUserEmail(res.data.user.email || '');
          setIsAdmin(res.data.user.isAdmin || false);
          setIsEmailVerified(res.data.user.isEmailVerified || false);
          setUserPlan(res.data.user.plan || 'free');
        }
      } catch (err) {
        console.warn('Erro ao carregar perfil:', err);
        // Se /auth/me falhar com 401, o interceptor do api.ts já redireciona pra login
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

  const monthFilteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    const { year: currentYear, month: currentMonth } = getYearMonth(selectedDate);
    return transactions.filter(t => {
      const { year: tYear, month: tMonth } = getYearMonth(t.date);
      return tYear === currentYear && tMonth === currentMonth;
    });
  }, [transactions, selectedDate]);

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
    // Limpa apenas preferências de UI, não dados de auth (cookies são HttpOnly, backend já limpou)
    navigate('/login');
  };

  const handleResendVerification = async () => {
    setIsResendingEmail(true);
    try {
      await api.post('/auth/resend-verification');
      addToast('E-mail de verificação reenviado! Verifique sua caixa de entrada.', 'success');
    } catch (err: any) {
      addToast(err.response?.data?.message || 'Erro ao reenviar e-mail.', 'error');
    } finally {
      setIsResendingEmail(false);
    }
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
        return <DashboardView transactions={transactions} isPrivacyEnabled={isPrivacyEnabled} isLoading={isLoading} onAddAccount={() => setActiveTab('accounts')} onAddTransaction={handleOpenTransactionForm} onAddBudget={() => setActiveTab('budgets')} />;
      case 'accounts':
        return <AccountsView isPrivacyEnabled={isPrivacyEnabled} />;
      case 'budgets':
        return <BudgetsView isPrivacyEnabled={isPrivacyEnabled} />;
      case 'goals':
        return <GoalsView isPrivacyEnabled={isPrivacyEnabled} />;
      case 'timeline':
        return <TimelineView transactions={transactions} />;
      case 'fixed':
        return <RecurringView />;
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
      case 'admin':
        return <AdminPanelView />;
      case 'settings':
        return <SettingsView userName={userName} userEmail={userEmail} userPlan={userPlan} transactions={transactions} onLogout={handleLogout} onNameChange={(name) => setUserName(name)} onEmailChange={(email) => setUserEmail(email)} />;
      default:
        return null;
    }
  };

  return (
    <>
    <SmartBanner />
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex text-slate-900 dark:text-slate-100 selection:bg-cyan-100 dark:selection:bg-cyan-900 selection:text-cyan-900 dark:selection:text-cyan-100 transition-colors duration-300">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} onOpenFeedback={() => setIsFeedbackOpen(true)} isAdmin={isAdmin} />
      <div className={`flex-1 sidebar-transition ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pb-24 lg:pb-0`}>
        <header className="sticky top-0 z-[100] bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 px-4 md:px-8 py-2 md:py-3 flex flex-row justify-between items-center gap-2 w-full max-w-[100vw] transition-colors duration-300">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-0.5 truncate">Gestão Financeira</p>
            <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight capitalize truncate flex items-center gap-3">
              {activeTab === 'dashboard' ? 'Dashboard' :
                activeTab === 'accounts' ? 'Contas & Cartões' :
                  activeTab === 'timeline' ? 'Linha do Tempo' :
                    activeTab === 'goals' ? 'Metas & Sonhos' :
                      activeTab === 'budgets' ? 'Orçamentos' :
                        activeTab === 'fixed' ? 'Recorrentes' :
                          activeTab === 'feedbacks' ? 'Feedbacks (Admin)' :
                        activeTab === 'admin' ? 'Painel Admin' :
                            activeTab === 'history' ? 'Extrato' :
                              'Configurações'}
              {userName && (
                <div className="flex flex-col border-l border-slate-200 dark:border-slate-800 pl-3">
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold leading-tight">Olá, {userName}</span>
                  {userEmail && <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium lowercase leading-tight">{userEmail}</span>}
                </div>
              )}
            </h2>
            {['dashboard', 'history', 'timeline', 'budgets'].includes(activeTab) && (
              <div className="mt-1.5 animate-in fade-in duration-300 relative z-[50]">
                <div className="flex items-center gap-3">
                  <MonthSelector />
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:inline-block">
                    {Array.isArray(transactions) ? transactions.length : 0} transações
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationCenter />
            <ActionMenu 
              isDarkMode={isDarkMode} 
              setIsDarkMode={setIsDarkMode} 
              isPrivacyEnabled={isPrivacyEnabled} 
              setIsPrivacyEnabled={setIsPrivacyEnabled} 
              onOpenImport={() => setIsImportOpen(true)} 
            />
            <button
              onClick={handleOpenTransactionForm}
              className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-cyan-600 text-white rounded-2xl hover:bg-cyan-700 font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-cyan-200 dark:shadow-none transition-all active:scale-95 whitespace-nowrap group"
            >
              <Plus className="w-4 h-4 sm:w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">+ Lançamento</span>
            </button>
          </div>
        </header>

        {showVerifyBanner && !isEmailVerified && (
          <div className="bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Verifique seu e-mail para acessar todos os recursos.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleResendVerification}
                  disabled={isResendingEmail}
                  className="text-xs font-bold uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {isResendingEmail ? 'Enviando...' : 'Reenviar E-mail'}
                </button>
                <button
                  onClick={() => {
                    setShowVerifyBanner(false);
                  }}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 text-lg font-bold leading-none p-1"
                  title="Dispensar"
                >
                  &times;
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 md:py-10 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
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
          accounts={accounts}
          creditCards={creditCards}
          categories={categories}
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

      {!isFormOpen && !isImportOpen && (
        <button
          onClick={handleOpenTransactionForm}
          className="fixed lg:hidden bottom-[100px] sm:bottom-[100px] right-4 md:right-8 z-50 bg-cyan-600 hover:bg-cyan-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-95 group"
          title="Novo Lançamento"
          style={{ boxShadow: '0 10px 25px -5px rgba(6, 182, 212, 0.4)' }}
        >
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}
    </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <MonthProvider>
        <CurrencyProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </CurrencyProvider>
      </MonthProvider>
    </ToastProvider>
  );
};

export default App;