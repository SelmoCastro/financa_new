/**
 * Componente reutilizável do frontend; encapsula uma parte relevante da interface dentro do domínio de componentes reutilizáveis da interface.
 */
import React, { Suspense } from 'react';
import { Transaction } from '../types';

const DashboardView = React.lazy(() => import('../views/DashboardView').then((mod) => ({ default: mod.DashboardView })));
const AccountsView = React.lazy(() => import('../views/accounts/AccountsView').then((mod) => ({ default: mod.AccountsView })));
const BudgetsView = React.lazy(() => import('../views/BudgetsView').then((mod) => ({ default: mod.BudgetsView })));
const GoalsView = React.lazy(() => import('../views/GoalsView').then((mod) => ({ default: mod.GoalsView })));
const TimelineView = React.lazy(() => import('../views/TimelineView').then((mod) => ({ default: mod.TimelineView })));
const HistoryView = React.lazy(() => import('../views/HistoryView').then((mod) => ({ default: mod.HistoryView })));
const RecurringView = React.lazy(() => import('../views/RecurringView').then((mod) => ({ default: mod.RecurringView })));
const SettingsView = React.lazy(() => import('../views/SettingsView').then((mod) => ({ default: mod.SettingsView })));
const FeedbackAdminView = React.lazy(() => import('../views/FeedbackAdminView').then((mod) => ({ default: mod.FeedbackAdminView })));
const AdminPanelView = React.lazy(() => import('../views/admin/AdminView').then((mod) => ({ default: mod.AdminPanelView })));
const InvoicesView = React.lazy(() => import('../views/InvoicesView').then((mod) => ({ default: mod.InvoicesView })));

const ViewFallback: React.FC = () => (
  <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white/60 py-12 text-sm font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
    Carregando seção...
  </div>
);


interface ViewRouterProps {
  activeTab: string;
  transactions: Transaction[];
  monthFilteredTransactions: Transaction[];
  isPrivacyEnabled: boolean;
  isLoading: boolean;
  transactionsLoadError: boolean;
  userName: string;
  userEmail: string;
  userPlan: string;
  onAddAccount: () => void;
  onAddTransaction: () => void;
  onAddBudget: () => void;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onLogout: () => void;
  onUserNameChange: (name: string) => void;
  onUserEmailChange: (email: string) => void;
}

export const ViewRouter: React.FC<ViewRouterProps> = ({
  activeTab, transactions, monthFilteredTransactions,
  isPrivacyEnabled, isLoading, transactionsLoadError, userName, userEmail, userPlan,
  onAddAccount, onAddTransaction, onAddBudget,
  onEditTransaction, onDeleteTransaction, onLogout,
  onUserNameChange, onUserEmailChange,
}) => {
  return (
    <Suspense fallback={<ViewFallback />}>
      {(() => {
        switch (activeTab) {

          case 'dashboard':
            return <DashboardView transactions={transactions} isPrivacyEnabled={isPrivacyEnabled} isLoading={isLoading} onAddAccount={onAddAccount} onAddTransaction={onAddTransaction} onAddBudget={onAddBudget} />;
          case 'accounts':
            return <AccountsView isPrivacyEnabled={isPrivacyEnabled} userPlan={userPlan} />;
          case 'budgets':
            return <BudgetsView isPrivacyEnabled={isPrivacyEnabled} userPlan={userPlan} isLoading={isLoading} />;
          case 'goals':
            return <GoalsView isPrivacyEnabled={isPrivacyEnabled} isLoading={isLoading} />;
          case 'timeline':
            return <TimelineView transactions={transactions} isPrivacyEnabled={isPrivacyEnabled} isLoading={isLoading} loadError={transactionsLoadError} />;
          case 'fixed':
            return <RecurringView isPrivacyEnabled={isPrivacyEnabled} />;
          case 'history':
            return <HistoryView transactions={monthFilteredTransactions} isPrivacyEnabled={isPrivacyEnabled} isLoading={isLoading} loadError={transactionsLoadError} onEdit={onEditTransaction} onDelete={onDeleteTransaction} />;
          case 'feedbacks':
            return <FeedbackAdminView />;
          case 'admin':
            return <AdminPanelView />;
          case 'settings':
            return <SettingsView userName={userName} userEmail={userEmail} userPlan={userPlan} transactions={transactions} onLogout={onLogout} onNameChange={onUserNameChange} onEmailChange={onUserEmailChange} />;
          case 'invoices':
            return <InvoicesView isPrivacyEnabled={isPrivacyEnabled} />;
          default:
            return null;
        }
      })()}
    </Suspense>
  );
};