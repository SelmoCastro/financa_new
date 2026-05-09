import React from 'react';
import { CreditCardForm } from '../components/CreditCardForm';
import { InstallmentFormModal } from '../views/accounts/InstallmentFormModal';
import { InvoicesViewTabs } from '../views/invoices/InvoicesViewTabs';
import { useInvoicesLogic, InstallFormData } from '../views/invoices/useInvoicesLogic';
import { InstallmentPreview } from '../views/accounts/types';

export const InvoicesView: React.FC<{ isPrivacyEnabled: boolean }> = ({ isPrivacyEnabled }) => {
  const logic = useInvoicesLogic();

  const parseCurrencyValue = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const installmentPreview: InstallmentPreview | null = React.useMemo(() => {
    const total = parseCurrencyValue(logic.installForm.totalAmount);
    const count = Number(logic.installForm.installmentCount) || 1;
    const entry = parseCurrencyValue(logic.installForm.entryAmount);
    if (total <= 0 || count < 1) return null;
    const perMonth = entry > 0 && count > 1
      ? Math.round(((total - entry) / (count - 1)) * 100) / 100
      : Math.round((total / count) * 100) / 100;
    return { entry, perMonth, count, total };
  }, [logic.installForm]);

  return (
    <>
      <InvoicesViewTabs
        isPrivacyEnabled={isPrivacyEnabled}
        creditCards={logic.creditCards}
        accounts={logic.accounts}
        selectedCardId={logic.selectedCardId}
        setSelectedCardId={logic.setSelectedCardId}
        invoices={logic.invoices}
        currentInvoice={logic.currentInvoice}
        isInvoicesLoading={logic.isInvoicesLoading}
        expandedInvoice={logic.expandedInvoice}
        setExpandedInvoice={logic.setExpandedInvoice}
        payAccountId={logic.payAccountId}
        setPayAccountId={logic.setPayAccountId}
        isPaying={logic.isPaying}
        handleCloseInvoice={logic.handleCloseInvoice}
        handlePayInvoice={logic.handlePayInvoice}
        handleDeleteTransaction={logic.handleDeleteTransaction}
        cardInstallments={logic.cardInstallments}
        expandedInstallId={logic.expandedInstallId}
        setExpandedInstallId={logic.setExpandedInstallId}
        openInstallModal={logic.openInstallModal}
        handleDeleteInstallment={logic.handleDeleteInstallment}
        openCardMenuId={logic.openCardMenuId}
        setOpenCardMenuId={logic.setOpenCardMenuId}
        cardMenuRef={logic.cardMenuRef}
        onEditCard={(card) => { logic.setEditingCard(card); logic.setIsCardFormOpen(true); }}
        onDeleteCard={logic.handleDeleteCard}
        onAddCard={() => logic.setIsCardFormOpen(true)}
        onAddInstallment={logic.openInstallModal}
      />

      {logic.isCardFormOpen && (
        <CreditCardForm
          accounts={logic.accounts}
          cardToEdit={logic.editingCard}
          onSave={logic.handleCardSaved}
          onClose={() => { logic.setIsCardFormOpen(false); logic.setEditingCard(null); }}
        />
      )}

      {logic.isInstallFormOpen && (
        <InstallmentFormModal
          installForm={logic.installForm}
          installmentPreview={installmentPreview}
          setInstallForm={(f: InstallFormData) => logic.setInstallForm(f)}
          onSubmit={logic.handleInstallSubmit}
          onClose={() => logic.setIsInstallFormOpen(false)}
          creditCardLimit={logic.installFormCardLimit}
          creditCardUsed={logic.installFormCardUsed}
        />
      )}
    </>
  );
};
