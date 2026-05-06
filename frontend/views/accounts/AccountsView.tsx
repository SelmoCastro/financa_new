import React from 'react';
import { AccountForm } from '../../components/AccountForm';
import { useAccountsLogic } from './useAccountsLogic';
import { AccountsSection } from './AccountsSection';
import { MonthlySummarySection } from './MonthlySummarySection';

export const AccountsView: React.FC<{ isPrivacyEnabled: boolean }> = ({ isPrivacyEnabled }) => {
  const logic = useAccountsLogic(isPrivacyEnabled);

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
          onAddAccount={() => logic.setIsAccountFormOpen(true)}
          onEditAccount={(acc) => { logic.setEditingAccount(acc); logic.setIsAccountFormOpen(true); }}
          onDeleteAccount={logic.handleDeleteAccount}
          onToggleMenu={logic.setOpenMenuId}
        />

        <MonthlySummarySection
          isPrivacyEnabled={isPrivacyEnabled}
          monthlySummary={logic.monthlySummary}
          expandedInstallId={logic.expandedInstallId}
          onToggleExpand={logic.setExpandedInstallId}
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