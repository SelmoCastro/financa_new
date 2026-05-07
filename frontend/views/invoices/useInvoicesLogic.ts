import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../../services/api';
import { creditCardService, CreditCardInstallmentDTO } from '../../services/creditCardService';
import { CreditCard } from '../../types';
import { useData } from '../../context/DataProvider';
import { useToast } from '../../context/ToastContext';

export interface InstallFormData {
  description: string;
  totalAmount: string;
  installmentCount: string;
  entryAmount: string;
  dueDay: string;
  accountId: string;
  categoryId: string;
}

export function useInvoicesLogic() {
  const { creditCards, accounts, categories, refreshData } = useData();
  const { addToast } = useToast();

  // Cartões
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  // Faturas
  const [selectedCardId, setSelectedCardId] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [isInvoicesLoading, setIsInvoicesLoading] = useState(false);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Pagamento
  const [payAccountId, setPayAccountId] = useState('');
  const [isPaying, setIsPaying] = useState<string | null>(null);

  // Parcelas
  const [cardInstallments, setCardInstallments] = useState<Record<string, CreditCardInstallmentDTO[]>>({});
  const [isInstallFormOpen, setIsInstallFormOpen] = useState(false);
  const [installFormCardId, setInstallFormCardId] = useState('');
  const [installForm, setInstallForm] = useState<InstallFormData>({
    description: '', totalAmount: '', installmentCount: '1', entryAmount: '', dueDay: '1', accountId: '', categoryId: ''
  });
  const [expandedInstallId, setExpandedInstallId] = useState<string | null>(null);

  // Close card menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (openCardMenuId && cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setOpenCardMenuId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openCardMenuId]);

  // Default card
  useEffect(() => {
    if (creditCards.length > 0 && !selectedCardId) {
      setSelectedCardId(creditCards[0].id);
    }
  }, [creditCards]);

  // Default pay account
  useEffect(() => {
    if (accounts.length > 0 && !payAccountId) {
      setPayAccountId(accounts[0].id);
    }
  }, [accounts]);

  // ── Cartões ──
  const handleCardSaved = () => {
    setIsCardFormOpen(false);
    setEditingCard(null);
    refreshData();
    addToast(editingCard ? 'Cartão atualizado!' : 'Cartão adicionado!', 'success');
  };

  const handleDeleteCard = async (id: string, name: string) => {
    if (!confirm(`Excluir cartão '${name}'?`)) return;
    setOpenCardMenuId(null);
    try {
      await api.delete(`/credit-cards/${id}`);
      addToast('Cartão excluído', 'success');
      if (selectedCardId === id) setSelectedCardId('');
      refreshData();
    } catch { addToast('Erro ao excluir', 'error'); }
  };

  // ── Faturas ──
  const fetchInvoices = useCallback(async () => {
    if (!selectedCardId) return;
    setIsInvoicesLoading(true);
    try {
      const [historyRes, currentRes] = await Promise.all([
        api.get(`/credit-card-invoices/${selectedCardId}/history`),
        api.get(`/credit-card-invoices/${selectedCardId}/current`),
      ]);
      setInvoices(historyRes.data || []);
      const cur = currentRes.data;
      if (cur && cur.transactions && cur.transactions.length > 0) {
        setCurrentInvoice({ ...cur, id: cur.id || 'open', creditCardName: cur.creditCardName || creditCards.find(c => c.id === selectedCardId)?.name || '', isPaid: false });
      } else {
        setCurrentInvoice(null);
      }
    } catch {
      setInvoices([]);
      setCurrentInvoice(null);
    } finally {
      setIsInvoicesLoading(false);
    }
  }, [selectedCardId, creditCards]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleCloseInvoice = async () => {
    if (!selectedCardId) return;
    setIsInvoicesLoading(true);
    try {
      await api.post(`/credit-card-invoices/${selectedCardId}/close`);
      addToast('Fatura fechada!', 'success');
      fetchInvoices();
      refreshData();
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Erro ao fechar', 'error');
    } finally { setIsInvoicesLoading(false); }
  };

  const handlePayInvoice = async (invoiceId: string, amount: number) => {
    if (!payAccountId) return;
    setIsPaying(invoiceId);
    try {
      await api.post(`/credit-card-invoices/${invoiceId}/pay`, { amount, accountId: payAccountId });
      addToast('Pagamento registrado!', 'success');
      fetchInvoices();
      refreshData();
    } catch (e: any) {
      addToast(e.response?.data?.message || 'Erro ao pagar', 'error');
    } finally { setIsPaying(null); }
  };

  // ── Parcelas ──
  const fetchInstallments = useCallback(async () => {
    try {
      const res = await creditCardService.getInstallments();
      const data: CreditCardInstallmentDTO[] = res.data;
      const grouped: Record<string, CreditCardInstallmentDTO[]> = {};
      data.forEach((i: CreditCardInstallmentDTO) => {
        if (!grouped[i.creditCardId]) grouped[i.creditCardId] = [];
        grouped[i.creditCardId].push(i);
      });
      setCardInstallments(grouped);
    } catch {}
  }, []);

  useEffect(() => { fetchInstallments(); }, [creditCards]);

  const openInstallModal = (cardId: string) => {
    setInstallFormCardId(cardId);
    setInstallForm({ description: '', totalAmount: '', installmentCount: '1', entryAmount: '', dueDay: '1', accountId: '', categoryId: '' });
    setIsInstallFormOpen(true);
  };

  const handleInstallSubmit = async () => {
    if (!installForm.description || !installForm.totalAmount) {
      addToast('Preencha descrição e valor', 'error');
      return;
    }
    try {
      await creditCardService.createInstallment(installFormCardId, {
        description: installForm.description,
        totalAmount: Number(installForm.totalAmount),
        installmentCount: Number(installForm.installmentCount),
        entryAmount: installForm.entryAmount ? Number(installForm.entryAmount) : undefined,
        dueDay: Number(installForm.dueDay),
        accountId: installForm.accountId || undefined,
        categoryId: installForm.categoryId || undefined,
      });
      addToast('Compra parcelada adicionada!', 'success');
      setIsInstallFormOpen(false);
      fetchInstallments();
      refreshData();
    } catch (e: any) {
      addToast(e?.response?.data?.message || 'Erro ao adicionar', 'error');
    }
  };

  const handleDeleteInstallment = async (id: string) => {
    if (!confirm('Remover esta compra parcelada?')) return;
    try {
      await creditCardService.deleteInstallment(id);
      addToast('Parcela removida', 'info');
      setExpandedInstallId(null);
      fetchInstallments();
      refreshData();
    } catch { addToast('Erro ao remover', 'error'); }
  };

  return {
    creditCards, accounts, categories,
    isCardFormOpen, setIsCardFormOpen, editingCard, setEditingCard,
    openCardMenuId, setOpenCardMenuId, cardMenuRef,
    handleCardSaved, handleDeleteCard,
    selectedCardId, setSelectedCardId,
    invoices, currentInvoice, isInvoicesLoading,
    expandedInvoice, setExpandedInvoice,
    payAccountId, setPayAccountId,
    isPaying, handleCloseInvoice, handlePayInvoice,
    cardInstallments, isInstallFormOpen, setIsInstallFormOpen,
    installFormCardId, installForm, setInstallForm,
    expandedInstallId, setExpandedInstallId,
    openInstallModal, handleInstallSubmit, handleDeleteInstallment,
    refreshData,
  };
}
