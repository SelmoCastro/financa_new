import api from './api';

export interface RecurringTransactionDTO {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  dueDay: number;
  startMonth: number;
  endMonth: number | null;
  isActive: boolean;
  categoryId: string | null;
  accountId: string | null;
  creditCardId: string | null;
  category: any;
  account: any;
  creditCard: any;
}

export interface WeightData {
  totalFixedExpense: number;
  monthlyIncome: number;
  weight: number;
  count: number;
}

export const recurringService = {
  getAll: () => api.get('/recurring-transactions'),

  getWeight: () => api.get('/recurring-transactions/weight'),

  create: (data: {
    description: string;
    amount: number;
    type: string;
    dueDay: number;
    startMonth?: number;
    endMonth?: number | null;
    categoryId?: string | null;
    accountId?: string | null;
    creditCardId?: string | null;
  }) => api.post('/recurring-transactions', data),

  update: (id: string, data: any) =>
    api.patch(`/recurring-transactions/${id}`, data),

  remove: (id: string) => api.delete(`/recurring-transactions/${id}`),

  toggle: (id: string) => api.patch(`/recurring-transactions/${id}/toggle`),
};
