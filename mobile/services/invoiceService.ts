import api from './api';

export interface InvoiceTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: string;
  category?: { id: string; name: string; color: string; icon: string };
}

export interface InvoiceDTO {
  id?: string;
  creditCardId: string;
  creditCardName?: string;
  referenceMonth: number;
  referenceYear: number;
  closingDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  isPaid: boolean;
  paidAt: string | null;
  transactions?: InvoiceTransaction[];
  isProjection?: boolean;
}

export const invoiceService = {
  /** Get current open invoice for a card (projection if not yet closed) */
  getCurrent: (creditCardId: string) =>
    api.get<InvoiceDTO>(`/credit-card-invoices/${creditCardId}/current`),

  /** Close the current billing period for a card */
  closeInvoice: (creditCardId: string) =>
    api.post<InvoiceDTO>(`/credit-card-invoices/${creditCardId}/close`),

  /** Pay an invoice (full or partial) */
  payInvoice: (invoiceId: string, data: { accountId: string; amount?: number }) =>
    api.post<InvoiceDTO>(`/credit-card-invoices/${invoiceId}/pay`, data),

  /** Get paid invoice history for a card */
  getHistory: (creditCardId: string) =>
    api.get<InvoiceDTO[]>(`/credit-card-invoices/${creditCardId}/history`),
};