import React from 'react';
import { CreditCardForm } from '../../components/CreditCardForm';
import { AccountForm } from '../../components/AccountForm';
import { useAccountsLogic } from './useAccountsLogic';
import { AccountsSection } from './AccountsSection';
import { CreditCardsSection } from './CreditCardsSection';
import { MonthlySummarySection } from './MonthlySummarySection';
import { InstallmentFormModal } from './InstallmentFormModal';

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

        <CreditCardsSection
          isPrivacyEnabled={isPrivacyEnabled}
          creditCards={logic.creditCards}
          cardInstallments={logic.cardInstallments}
          openCardMenuId={logic.openCardMenuId}
          cardMenuRef={logic.cardMenuRef}
          expandedInstallId={logic.expandedInstallId}
          onAddCard={() => logic.setIsCardFormOpen(true)}
          onEditCard={(card) => { logic.setEditingCard(card); logic.setIsCardFormOpen(true); }}
          onDeleteCard={logic.handleDeleteCard}
          onToggleCardMenu={logic.setOpenCardMenuId}
          onOpenInstallModal={logic.openInstallModal}
          onDeleteInstallment={logic.handleDeleteInstallment}
          onToggleExpand={logic.setExpandedInstallId}
        />

        <MonthlySummarySection
          isPrivacyEnabled={isPrivacyEnabled}
          monthlySummary={logic.monthlySummary}
          expandedInstallId={logic.expandedInstallId}
          onToggleExpand={logic.setExpandedInstallId}
        />
      </div>

      {logic.isCardFormOpen && (
        <CreditCardForm
          accounts={logic.accounts}
          cardToEdit={logic.editingCard}
          onSave={logic.handleCardSaved}
          onClose={() => { logic.setIsCardFormOpen(false); logic.setEditingCard(null); }}
        />
      )}

      {logic.isAccountFormOpen && (
        <AccountForm
          accountToEdit={logic.editingAccount}
          onSave={logic.handleAccountSaved}
          onClose={() => { logic.setIsAccountFormOpen(false); logic.setEditingAccount(null); }}
        />
      )}

      {logic.isInstallFormOpen && (
        <InstallmentFormModal
          installForm={logic.installForm}
          installmentPreview={logic.installmentPreview}
          setInstallForm={logic.setInstallForm}
          onSubmit={logic.handleInstallSubmit}
          onClose={() => logic.setIsInstallFormOpen(false)}
        />
      )}
    </>
  );
};