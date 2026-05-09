import api from './api';

export interface CreditCardInstallmentDTO {
  id: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  currentInstallment: number;
  amountPerMonth: number;
  dueDay: number;
  entryAmount: number | null;
  isActive: boolean;
  accountId: string | null;
  creditCardId: string;
  categoryId: string | null;
  category: any;
  account: any;
  creditCard: any;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentScheduleItem {
  month: number;
  year: number;
  amount: number;
  installmentNumber: number;
  isPaid: boolean;
  isEntry: boolean;
}

export const creditCardService = {
  getInstallments: (cardId?: string) =>
    cardId
      ? api.get<CreditCardInstallmentDTO[]>(`/credit-cards/${cardId}/installments`)
      : api.get<CreditCardInstallmentDTO[]>('/credit-cards/installments/all'),

  getAllInstallments: () =>
    api.get<CreditCardInstallmentDTO[]>('/credit-cards/installments/all'),

  createInstallment: (
    cardId: string,
    data: {
      description: string;
      totalAmount: number;
      installmentCount: number;
      entryAmount?: number | null;
      dueDay: number;
      accountId?: string | null;
      categoryId?: string | null;
    },
  ) => api.post(`/credit-cards/${cardId}/installments`, data),

  updateInstallment: (id: string, data: any) =>
    api.patch(`/credit-cards/installments/${id}`, data),

  deleteInstallment: (id: string) =>
    api.delete(`/credit-cards/installments/${id}`),

  getInstallmentSchedule: (cardId: string) =>
    api.get<InstallmentScheduleItem[]>(`/credit-cards/${cardId}/installments/schedule`),
};