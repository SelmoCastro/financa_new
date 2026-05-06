import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, CreditCard, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Banknote, RefreshCw } from 'lucide-react';
import { useData } from '../context/DataProvider';
import { useCurrency } from '../context/CurrencyContext';
import api from '../services/api';
import { Skeleton } from '../components/Skeleton';

interface InvoiceDetail {
  id: string;
  creditCardName: string;
  referenceMonth: number;
  referenceYear: number;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  closingDate: string;
  dueDate: string;
  isPaid: boolean;
  transactions: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category?: { name: string } | null;
  }>;
}

interface InvoicesViewProps {
  isPrivacyEnabled: boolean;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({ isPrivacyEnabled }) => {
  const { formatCurrency } = useCurrency();
  const { creditCards, accounts, refreshData } = useData();
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [invoices, setInvoices] = useState<InvoiceDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [payAccountId, setPayAccountId] = useState('');

  // Set default card on mount
  useEffect(() => {
    if (creditCards.length > 0 && !selectedCardId) {
      setSelectedCardId(creditCards[0].id);
    }
  }, [creditCards, selectedCardId]);

  // Fetch invoices when card changes
  useEffect(() => {
    if (!selectedCardId) return;

    const fetchInvoices = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/credit-card-invoices/${selectedCardId}/history`);
        setInvoices(res.data || []);
      } catch (err) {
        console.error('Failed to load invoices:', err);
        setInvoices([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, [selectedCardId]);

  // Set default account for payment
  useEffect(() => {
    if (accounts.length > 0 && !payAccountId) {
      setPayAccountId(accounts[0].id);
    }
  }, [accounts, payAccountId]);

  const handlePayInvoice = async (invoiceId: string, amount: number) => {
    if (!payAccountId) return;

    setIsPaying(invoiceId);
    try {
      await api.post(`/credit-card-invoices/${invoiceId}/pay`, {
        amount,
        accountId: payAccountId,
      });
      // Refresh invoices list
      const res = await api.get(`/credit-card-invoices/${selectedCardId}/history`);
      setInvoices(res.data || []);
      await refreshData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao pagar fatura');
    } finally {
      setIsPaying(null);
    }
  };

  const handleCloseInvoice = async () => {
    if (!selectedCardId) return;
    setIsLoading(true);
    try {
      await api.post(`/credit-card-invoices/${selectedCardId}/close`);
      const res = await api.get(`/credit-card-invoices/${selectedCardId}/history`);
      setInvoices(res.data || []);
      await refreshData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Erro ao fechar fatura');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCard = creditCards.find((c) => c.id === selectedCardId);

  const totalPending = useMemo(() =>
    invoices
      .filter((inv) => !inv.isPaid)
      .reduce((sum, inv) => sum + (inv.totalAmount - inv.paidAmount), 0),
  [invoices]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Card Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
          <Receipt className="w-5 h-5 text-cyan-500" />
          Faturas
        </h2>
        {creditCards.length === 0 ? (
          <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Nenhum cartão cadastrado</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Adicione um cartão de crédito em "Contas & Cartões" para ver as faturas.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            {creditCards.map((card) => (
              <button
                key={card.id}
                onClick={() => setSelectedCardId(card.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  selectedCardId === card.id
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                {card.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {selectedCard && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Limite</p>
            <p className="text-lg font-black text-slate-800 dark:text-white">
              {isPrivacyEnabled ? '••••' : formatCurrency(Number(selectedCard.limit))}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-200 dark:border-amber-500/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-1">Pendente</p>
            <p className="text-lg font-black text-amber-700 dark:text-amber-300">
              {isPrivacyEnabled ? '••••' : formatCurrency(totalPending)}
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Ações</p>
              <button
                onClick={handleCloseInvoice}
                disabled={isLoading}
                className="text-xs font-bold bg-cyan-600 text-white px-3 py-1.5 rounded-xl hover:bg-cyan-700 disabled:opacity-50"
              >
                {isLoading ? 'Fechando...' : 'Fechar Fatura'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice List */}
      {isLoading && invoices.length === 0 ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/30 rounded-[2.5rem] p-10 text-center border border-dashed border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-700 dark:text-slate-200 font-black mb-1">Nenhuma fatura encontrada</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            As faturas serão fechadas automaticamente no dia de fechamento do cartão.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((inv) => {
            const isExpanded = expandedInvoice === inv.id;
            const remaining = inv.totalAmount - inv.paidAmount;

            return (
              <div
                key={inv.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all ${
                  inv.isPaid
                    ? 'border-emerald-200 dark:border-emerald-500/20'
                    : remaining > 0
                      ? 'border-amber-200 dark:border-amber-500/20'
                      : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                  className="w-full flex items-center justify-between p-4 md:p-6 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2.5 rounded-xl ${
                        inv.isPaid
                          ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600'
                          : 'bg-amber-100 dark:bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {inv.isPaid ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 dark:text-slate-200">
                        {inv.creditCardName} — {String(inv.referenceMonth).padStart(2, '0')}/{inv.referenceYear}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        Fecha {new Date(inv.closingDate).toLocaleDateString('pt-BR')}
                        {' '}· Vence {new Date(inv.dueDate).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-lg font-black ${isPrivacyEnabled ? 'blur-sm' : remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {isPrivacyEnabled ? '••••' : formatCurrency(remaining)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">
                        Total: {isPrivacyEnabled ? '••••' : formatCurrency(inv.totalAmount)}
                        {inv.paidAmount > 0 ? ` | Pago: ${isPrivacyEnabled ? '••••' : formatCurrency(inv.paidAmount)}` : ''}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 md:p-6 space-y-4">
                    {/* Payment section for unpaid invoices */}
                    {!inv.isPaid && remaining > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-500/5 rounded-2xl p-4 flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 block mb-1">Conta de débito</label>
                          <select
                            value={payAccountId}
                            onChange={(e) => setPayAccountId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-200"
                          >
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => handlePayInvoice(inv.id, remaining)}
                          disabled={isPaying === inv.id}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 transition-all active:scale-95"
                        >
                          {isPaying === inv.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Banknote className="w-4 h-4" />
                          )}
                          {isPaying === inv.id ? 'Pagando...' : `Pagar ${isPrivacyEnabled ? '••••' : formatCurrency(remaining)}`}
                        </button>
                      </div>
                    )}

                    {/* Transactions list */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        {inv.transactions.length} transação{inv.transactions.length !== 1 ? 'ões' : ''} neste período
                      </p>
                      <div className="space-y-2">
                        {inv.transactions.length === 0 ? (
                          <p className="text-sm text-slate-400 font-medium p-2">Nenhuma transação neste período.</p>
                        ) : (
                          inv.transactions.map((tx) => (
                            <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                              <div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{tx.description}</p>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  {new Date(tx.date).toLocaleDateString('pt-BR')}
                                  {tx.category?.name ? ` · ${tx.category.name}` : ''}
                                </p>
                              </div>
                              <span className={`text-sm font-black ${isPrivacyEnabled ? 'blur-sm' : 'text-slate-800 dark:text-white'}`}>
                                {isPrivacyEnabled ? '••••' : formatCurrency(tx.amount)}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
