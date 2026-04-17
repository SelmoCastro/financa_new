export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  type: TransactionType;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export interface CreditCard {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  accountId: string;
  account?: Account;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  isFixed?: boolean;
  categoryId?: string;
  category?: Category;
  categoryLegacy?: string;
  accountId?: string;
  account?: Account;
  destinationAccountId?: string;
  creditCardId?: string;
  creditCard?: CreditCard;
  sharedWithEmail?: string;
}

export interface Budget {
  id: string;
  amount: number;
  categoryId: string;
  categoryObj: Category;
  spent?: number;
  percentage?: number;
  isOverBudget?: boolean;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}
