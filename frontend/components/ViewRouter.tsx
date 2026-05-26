import React from 'react';
import { InvoicesView } from '../views/InvoicesView';
import { DashboardView } from '../views/DashboardView';
import { BudgetsView } from '../views/BudgetsView';
import { GoalsView } from '../views/GoalsView';
import { TimelineView } from '../views/TimelineView';
import { HistoryView } from '../views/HistoryView';
import { RecurringView } from '../views/RecurringView';
import { SettingsView } from '../views/SettingsView';
import { AccountsView } from '../views/accounts/AccountsView';
import { FeedbackAdminView } from '../views/FeedbackAdminView';
import { AdminPanelView } from '../views/admin/AdminView';
import { Transaction } from '../types';

interface ViewRouterProps {
  activeTab: string;
  transactions: Transaction[];
  monthFilteredTransactions: Transaction[];
  isPrivacyEnabled: boolean;
  isLoading: boolean;
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
  onUpgrade: () => void;
}

export const ViewRouter: React.FC<ViewRouterProps> = ({
  activeTab, transactions, monthFilteredTransactions,
  isPrivacyEnabled, isLoading, userName, userEmail, userPlan,
  onAddAccount, onAddTransaction, onAddBudget,
  onEditTransaction, onDeleteTransaction, onLogout,
  onUserNameChange, onUserEmailChange, onUpgrade,
}) => {
  switch (activeTab) {
    case 'dashboard':
      return <DashboardView transactions={transactions} isPrivacyEnabled={isPrivacyEnabled} isLoading={isLoading} onAddAccount={onAddAccount} onAddTransaction={onAddTransaction} onAddBudget={onAddBudget} />;
    case 'accounts':
      return <AccountsView isPrivacyEnabled={isPrivacyEnabled} userPlan={userPlan} onUpgrade={onUpgrade} />;
    case 'budgets':
      return <BudgetsView isPrivacyEnabled={isPrivacyEnabled} userPlan={userPlan} onUpgrade={onUpgrade} />;
    case 'goals':
      return <GoalsView isPrivacyEnabled={isPrivacyEnabled} />;
    case 'timeline':
      return <TimelineView transactions={transactions} isPrivacyEnabled={isPrivacyEnabled} />;
    case 'fixed':
      return <RecurringView isPrivacyEnabled={isPrivacyEnabled} />;
    case 'history':
      return <HistoryView transactions={monthFilteredTransactions} isPrivacyEnabled={isPrivacyEnabled} onEdit={onEditTransaction} onDelete={onDeleteTransaction} />;
    case 'feedbacks':
      return <FeedbackAdminView />;
    case 'admin':
      return <AdminPanelView />;
    case 'settings':
      return <SettingsView userName={userName} userEmail={userEmail} userPlan={userPlan} transactions={transactions} onLogout={onLogout} onNameChange={onUserNameChange} onEmailChange={onUserEmailChange} onUpgrade={onUpgrade} />;
    case 'invoices':
      return <InvoicesView isPrivacyEnabled={isPrivacyEnabled} />;
    default:
      return null;
  }
};