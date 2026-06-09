/**
 * Tela principal do frontend para Accounts; reúne estado visual, ações do usuário e composição de componentes.
 */
import React from 'react';
import { AccountForm } from '../../components/AccountForm';
import { useAccountsLogic } from './useAccountsLogic';
import { AccountsSection } from './AccountsSection';
import { useToast } from '../../context/ToastContext';

export const AccountsView: React.FC<{ isPrivacyEnabled: boolean; userPlan: string }> = ({ isPrivacyEnabled, userPlan }) => {
  const { addToast } = useToast();
  const logic = useAccountsLogic(isPrivacyEnabled);
  const isAccountLimitReached = userPlan !== 'premium' && logic.accounts.length >= 1;

  const handleAddAccount = () => {
    if (isAccountLimitReached) {
      addToast('Plano Free permite 1 conta. Seu plano atual é Free.', 'info');
      return;
    }
    logic.setEditingAccount(null);
    logic.setIsAccountFormOpen(true);
  };

  if (logic.isLoading) {
    return <div className="animate-pulse space-y-6">
      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
      <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
    </div>;
  }

  return (
    <>
      <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <AccountsSection
          isPrivacyEnabled={isPrivacyEnabled}
          accounts={logic.accounts}
          totalBalance={logic.totalBalance}
          openMenuId={logic.openMenuId}
          menuRef={logic.menuRef}
          onAddAccount={handleAddAccount}
          onEditAccount={(acc) => { logic.setEditingAccount(acc); logic.setIsAccountFormOpen(true); }}
          onDeleteAccount={logic.handleDeleteAccount}
          onToggleMenu={logic.setOpenMenuId}
        />
      </div>

      {logic.isAccountFormOpen && (
        <AccountForm
          accountToEdit={logic.editingAccount}
          onSave={logic.handleAccountSaved}
          onClose={() => { logic.setIsAccountFormOpen(false); logic.setEditingAccount(null); }}
        />
      )}
    </>
  );
};