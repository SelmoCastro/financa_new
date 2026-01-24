
export type TransactionType = 'INCOME' | 'EXPENSE';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: TransactionType;
  isFixed?: boolean;
}

export interface Budget {
  category: string;
  limit: number;
  spent: number;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
}
