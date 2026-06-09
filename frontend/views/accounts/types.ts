/**
 * Arquivo de apoio da camada de views; define tipos, hooks ou utilitários usados pelas telas principais.
 */
import { Account, CreditCard } from '../../types';
import { CreditCardInstallmentDTO } from '../../services/creditCardService';

export interface InstallFormData {
  description: string;
  totalAmount: string;
  installmentCount: string;
  entryAmount: string;
  dueDay: string;
  accountId: string;
  categoryId: string;
}

export interface InstallmentPreview {
  entry: number;
  perMonth: number;
  count: number;
  total: number;
}

export interface MonthlySummaryItem {
  description: string;
  amount: number;
  cardName: string;
  installmentNumber: number;
}

export interface MonthlySummaryGroup {
  key: string;
  month: number;
  year: number;
  total: number;
  items: MonthlySummaryItem[];
}

export interface AccountsLogic {
  // Forms
  isCardFormOpen: boolean;
  isAccountFormOpen: boolean;
  isInstallFormOpen: boolean;
  editingAccount: Account | null;
  editingCard: CreditCard | null;
  installFormCardId: string;
  installForm: InstallFormData;
  installmentPreview: InstallmentPreview | null;
  // Menus
  openMenuId: string | null;
  openCardMenuId: string | null;
  expandedInstallId: string | null;
  // Data
  accounts: Account[];
  creditCards: CreditCard[];
  isLoading: boolean;
  totalBalance: number;
  cardInstallments: Record<string, CreditCardInstallmentDTO[]>;
  monthlySummary: MonthlySummaryGroup[];
  // Actions
  setIsCardFormOpen: (v: boolean) => void;
  setIsAccountFormOpen: (v: boolean) => void;
  setIsInstallFormOpen: (v: boolean) => void;
  setEditingAccount: (a: Account | null) => void;
  setEditingCard: (c: CreditCard | null) => void;
  setOpenMenuId: (id: string | null) => void;
  setOpenCardMenuId: (id: string | null) => void;
  setExpandedInstallId: (id: string | null) => void;
  setInstallForm: (f: InstallFormData) => void;
  openInstallModal: (cardId: string) => void;
  handleCardSaved: () => void;
  handleAccountSaved: () => void;
  handleDeleteAccount: (id: string, name: string) => void;
  handleDeleteCard: (id: string, name: string) => void;
  handleInstallSubmit: () => void;
  handleDeleteInstallment: (id: string) => void;
  // Custom installment values
  useCustomValues: boolean;
  setUseCustomValues: (v: boolean) => void;
  installmentAmounts: string[];
  setInstallmentAmounts: (v: string[]) => void;
}