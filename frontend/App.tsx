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
import { ImportOverlay } from './components/ImportOverlay';
import { ToastProvider, useToast } from './context/ToastContext';
import { MonthProvider, useMonth } from './context/MonthContext';
import { DataProvider, useData } from './context/DataProvider';
import { MonthSelector } from './components/MonthSelector';
import { Transaction } from './types';
import { TransactionForm } from './components/TransactionForm';
import { ChatWidget } from './components/ChatWidget';
import { getYearMonth } from './utils/dateUtils';
import { UploadCloud, Plus, ChevronLeft, ChevronRight, EyeOff, Eye, CheckSquare, Image, FileSpreadsheet } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    transactions, accounts, creditCards, categories, dashboardSummary, isLoading, refreshData,
    addTransaction, updateTransaction, deleteTransaction
  } = useData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'Usuário');
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { selectedDate } = useMonth();

  const totals = useMemo(() => ({
    balance: dashboardSummary?.balance || 0,
    income: dashboardSummary?.currentMonth?.income || 0,
    expense: dashboardSummary?.currentMonth?.expense || 0,
    currentIncome: dashboardSummary?.currentMonth?.income || 0,
    currentExpense: dashboardSummary?.currentMonth?.expense || 0,
    incomeTrend: 0,
    expenseTrend: 0
  }), [dashboardSummary]);

  // Timeline, History e Budgets utilizam transações filtradas localmente.
  // O array `transactions` base tem todo o histórico para a Dashboard projetar Saldo e Gráficos corretamente.
  const monthFilteredTransactions = useMemo(() => {
    const { year: currentYear, month: currentMonth } = getYearMonth(selectedDate);
    return transactions.filter(t => {
      const { year: tYear, month: tMonth } = getYearMonth(t.date);
      return tYear === currentYear && tMonth === currentMonth;
    });
  }, [transactions, selectedDate]);

  const forecast = useFixedTransactions(transactions, totals);

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
        return <TimelineView transactions={transactions} />;
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
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 md:px-8 py-4 md:py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 w-full max-w-[100vw] overflow-hidden">
          <div className="min-w-0 flex-1 w-full sm:w-auto">
            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 truncate">Gestão Financeira</p>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight capitalize truncate">
              {activeTab === 'dashboard' ? 'Dashboard' :
                activeTab === 'accounts' ? 'Contas & Cartões' :
                  activeTab === 'timeline' ? 'Linha do Tempo' :
                    activeTab === 'goals' ? 'Metas & Sonhos' :
                      activeTab === 'budgets' ? 'Orçamentos' :
                        activeTab === 'fixed' ? 'Controle Fixos' :
                          activeTab === 'history' ? 'Extrato' :
                            'Configurações'}
              {userName && (
                <span className="block text-xs text-indigo-600 font-bold mt-1">Olá, {userName}</span>
              )}
            </h2>
            {activeTab === 'dashboard' && (
              <div className="mt-3 animate-in fade-in duration-300 w-full overflow-x-auto pb-1">
                <MonthSelector />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 md:gap-3 flex-wrap w-full sm:w-auto mt-2 sm:mt-0">
            <a
              href="/Finanza_new.apk"
              download
              className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold transition-all"
              title="Baixar App Mobile (Android)"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0004.5511-.4482.9997-.9993.9997zm-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997zm11.4045-6.02l1.9973-3.4592c.1158-.201.0467-.4582-.1546-.574-.2013-.1158-.4586-.0467-.5743.1546l-2.0362 3.527c-1.4816-.6802-3.1611-1.0592-4.9458-1.077v-.004s-.0448-.0004-.0456-.0004c-.0011 0-.0456.0004-.0456.0004v.004c-1.7847.0178-3.4642.3968-4.9461 1.077L5.0945 5.4431c-.115-.2017-.3734-.2711-.574-.1553-.2013.1158-.2707.373-.1549.5744l1.9969 3.4588C2.6865 11.3855.2343 15.3524.0321 20.0006h23.9351c-.2018-4.6482-2.6541-8.6151-6.3297-10.6792z" />
              </svg>
              <span className="hidden sm:inline">Baixar APK Android</span>
            </a>
            <button
              onClick={() => setIsPrivacyEnabled(!isPrivacyEnabled)}
              className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all active:scale-95"
              title={isPrivacyEnabled ? "Mostrar valores" : "Ocultar valores"}
            >
              {isPrivacyEnabled ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
              onClick={() => setIsImportOpen(true)}
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-2 md:gap-3 flex-shrink-0">
              <Plus className="w-4 h-4 md:w-5 md:h-5" />
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
          onClose={() => {
            setIsFormOpen(false);
            setEditingTransaction(null);
          }}
          existingCategories={Array.from(new Set(transactions.map(t => typeof t.category === 'object' && t.category !== null ? t.category.name : t.categoryLegacy || 'Outros'))).filter(Boolean)}
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

      {/* AI Assistant Chat */}
      {!isLoading && <ChatWidget />}
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
