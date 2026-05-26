import React from 'react';
import { AccountForm } from '../../components/AccountForm';
import { useAccountsLogic } from './useAccountsLogic';
import { AccountsSection } from './AccountsSection';
import { useToast } from '../../context/ToastContext';

export const AccountsView: React.FC<{ isPrivacyEnabled: boolean; userPlan: string; onUpgrade: () => void }> = ({ isPrivacyEnabled, userPlan, onUpgrade }) => {
  const { addToast } = useToast();
  const logic = useAccountsLogic(isPrivacyEnabled);
  const isAccountLimitReached = userPlan !== 'premium' && logic.accounts.length >= 1;

  const handleAddAccount = () => {
    if (isAccountLimitReached) {
      addToast('Plano Free permite 1 conta. Faça upgrade para Premium para criar mais contas.', 'info');
      onUpgrade();
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
        {isAccountLimitReached && (
          <div className="glass-card border border-cyan-100 dark:border-cyan-500/20 bg-cyan-50/70 dark:bg-cyan-500/10 rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400 mb-1">Limite do plano Free</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Você já usa a 1 conta incluída no Free. Para criar mais contas, faça upgrade para o plano Premium.
              </p>
            </div>
            <button
              onClick={onUpgrade}
              className="px-5 py-3 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 whitespace-nowrap"
            >
              Ver Premium
            </button>
          </div>
        )}
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