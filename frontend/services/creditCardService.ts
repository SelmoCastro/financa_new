import api from './api';

export interface InstallmentScheduleItem {
  installmentNumber: number;
  month: number;
  year: number;
  dueDate: string;
  amount: number;
}

export interface CreditCardInstallmentDTO {
  id: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  currentInstallment: number;
  amountPerMonth: number;
  entryAmount: number | null;
  startDate: string;
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

  getInstallmentSchedule: (id: string) =>
    api.get(`/credit-cards/installments/${id}/schema`).catch(() => {
      // fallback: compute schedule on client side if endpoint not available
      return null;
    }),

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
};

/**
 * Compute installment schedule on the client side
 * based on installment data + entry amount
 */
export function computeSchedule(inst: {
  installmentCount: number;
  totalAmount: number;
  amountPerMonth: number;
  entryAmount: number | null;
  startDate: string;
  dueDay: number;
}): InstallmentScheduleItem[] {
  const entryAmount = inst.entryAmount ? Number(inst.entryAmount) : 0;
  const start = new Date(inst.startDate);
  const schedule: InstallmentScheduleItem[] = [];

  for (let i = 1; i <= inst.installmentCount; i++) {
    const monthOffset = i - 1;
    const dueDate = new Date(start.getFullYear(), start.getMonth() + monthOffset, inst.dueDay);
    const expectedMonth = (start.getMonth() + monthOffset) % 12;
    if (dueDate.getMonth() !== expectedMonth) {
      dueDate.setDate(0);
    }

    const amount = (entryAmount > 0 && i === 1) ? entryAmount : Number(inst.amountPerMonth);

    schedule.push({
      installmentNumber: i,
      month: dueDate.getMonth() + 1,
      year: dueDate.getFullYear(),
      dueDate: dueDate.toISOString().split('T')[0],
      amount,
    });
  }
  return schedule;
}

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function formatMonth(month: number): string {
  return MONTH_NAMES[month - 1] || month.toString();
}