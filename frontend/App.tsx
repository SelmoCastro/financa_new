
import React, { useState, useEffect, useMemo } from 'react';
import { Transaction } from './types';
import { TransactionForm } from './components/TransactionForm';
import { Sidebar } from './components/Sidebar';
import { FixedItems } from './components/FixedItems';
import api from './services/api';
import { useNavigate } from 'react-router-dom';
import { useFixedTransactions } from './hooks/useFixedTransactions';
import { DashboardView } from './views/DashboardView';
import { GoalsView } from './views/GoalsView';

// ... (existing imports)

// Inside renderContent:
      case 'budgets':
return (
  <BudgetsView existingCategories={Array.from(new Set(transactions.map(t => t.category)))} />
);
      case 'goals':
return <GoalsView />;
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
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center w-full max-w-[100vw] overflow-hidden">
        <div className="min-w-0 flex-1 mr-2">
          <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 truncate">Gestão Financeira</p>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight capitalize truncate">
            {activeTab === 'dashboard' ? 'Dashboard' :
              activeTab === 'timeline' ? 'Linha do Tempo' :
                activeTab === 'goals' ? 'Metas & Sonhos' :
                  activeTab === 'budgets' ? 'Orçamentos' :
                    activeTab === 'fixed' ? 'Controle Fixos' :
                      activeTab === 'history' ? 'Extrato' :
                        activeTab === 'recent' ? 'Lançamentos' : 'Configurações'}
            case 'budgets':
            return (
            <BudgetsView existingCategories={Array.from(new Set(transactions.map(t => t.category)))} />
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
                <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center w-full max-w-[100vw] overflow-hidden">
                  <div className="min-w-0 flex-1 mr-2">
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
