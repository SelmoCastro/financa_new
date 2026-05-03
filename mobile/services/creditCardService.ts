import api from './api';

export interface CreditCardInstallmentDTO {
  id: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  currentInstallment: number;
  amountPerMonth: number;
  dueDay: number;
  isActive: boolean;
  accountId: string | null;
  creditCardId: string;
  categoryId: string | null;
  category: any;
  account: any;
  creditCard: any;
}

export const creditCardService = {
  getInstallments: (cardId?: string) =>
    cardId
      ? api.get(`/credit-cards/${cardId}/installments`)
      : api.get('/credit-cards/installments/all'),

  createInstallment: (
    cardId: string,
    data: {
      description: string;
      totalAmount: number;
      installmentCount: number;
      dueDay: number;
      accountId?: string | null;
      categoryId?: string | null;
    },
  ) => api.post(`/credit-cards/${cardId}/installments`, data),

  updateInstallment: (id: string, data: any) =>
    api.patch(`/credit-cards/installments/${id}`, data),

  deleteInstallment: (id: string) =>
    api.delete(`/credit-cards/installments/${id}`),
};
