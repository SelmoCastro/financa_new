export type TransactionType = 'INCOME' | 'EXPENSE';

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
  creditCardId?: string;
  creditCard?: CreditCard;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  spent?: number;
  percentage?: number;
  isOverBudget?: boolean;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}
