import { useState, useEffect, useMemo, useRef } from 'react';
import api from '../../services/api';
import { Account, CreditCard } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useData } from '../../context/DataProvider';
import { creditCardService, CreditCardInstallmentDTO, computeSchedule } from '../../services/creditCardService';
import { AccountsLogic, InstallFormData, InstallmentPreview, MonthlySummaryGroup } from './types';

interface UseAccountsLogicReturn extends AccountsLogic {
  menuRef: React.RefObject<HTMLDivElement | null>;
  cardMenuRef: React.RefObject<HTMLDivElement | null>;
}

export function useAccountsLogic(isPrivacyEnabled: boolean): UseAccountsLogicReturn {
  const [isCardFormOpen, setIsCardFormOpen] = useState(false);
  const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [cardInstallments, setCardInstallments] = useState<Record<string, CreditCardInstallmentDTO[]>>({});
  const [isInstallFormOpen, setIsInstallFormOpen] = useState(false);
  const [installFormCardId, setInstallFormCardId] = useState('');
  const [installForm, setInstallForm] = useState<InstallFormData>({
    description: '', totalAmount: '', installmentCount: '1', entryAmount: '', dueDay: '1', accountId: '', categoryId: ''
  });
  const [expandedInstallId, setExpandedInstallId] = useState<string | null>(null);
  const { addToast } = useToast();
  const { accounts, creditCards, isLoading, refreshData } = useData();

  const menuRef = useRef<HTMLDivElement>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (openMenuId && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
      if (openCardMenuId && cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setOpenCardMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId, openCardMenuId]);

  const totalBalance = useMemo(() => accounts.reduce((acc, curr) => acc + Number(curr.balance), 0), [accounts]);

  // Fetch installments for all cards
  const fetchInstallments = async () => {
    try {
      const res = await creditCardService.getInstallments();
      const data: CreditCardInstallmentDTO[] = res.data;
      const grouped: Record<string, CreditCardInstallmentDTO[]> = {};
      data.forEach(i => {
        if (!grouped[i.creditCardId]) grouped[i.creditCardId] = [];
        grouped[i.creditCardId].push(i);
      });
      setCardInstallments(grouped);
    } catch (e) { /* silent */ }
  };

  useEffect(() => { fetchInstallments(); }, [creditCards]);

  // Monthly summary of installments
  const monthlySummary = useMemo((): MonthlySummaryGroup[] => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const allInstallments = Object.values(cardInstallments).flat();
    const groupedByMonth: Record<string, MonthlySummaryGroup> = {};

    allInstallments.forEach(inst => {
      if (!inst.isActive) return;
      const schedule = computeSchedule({
        installmentCount: inst.installmentCount,
        totalAmount: inst.totalAmount,
        amountPerMonth: inst.amountPerMonth,
        entryAmount: inst.entryAmount,
        startDate: inst.startDate,
        dueDay: inst.dueDay
      });

      schedule.forEach(schedItem => {
        const installmentDate = new Date(schedItem.year, schedItem.month - 1, 1);
        const currentMonthDate = new Date(currentYear, currentMonth - 1, 1);

        if (installmentDate >= currentMonthDate && schedItem.installmentNumber > inst.currentInstallment) {
          const monthKey = `${schedItem.month}/${schedItem.year}`;
          if (!groupedByMonth[monthKey]) {
            groupedByMonth[monthKey] = {
              key: monthKey, month: schedItem.month, year: schedItem.year, total: 0, items: []
            };
          }
          groupedByMonth[monthKey].total += schedItem.amount;
          groupedByMonth[monthKey].items.push({
            description: inst.description,
            amount: schedItem.amount,
            cardName: inst.creditCard?.name || 'Cartão Desconhecido',
            installmentNumber: schedItem.installmentNumber
          });
        }
      });
    });

    return Object.values(groupedByMonth).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [cardInstallments]);

  const openInstallModal = (cardId: string) => {
    setInstallFormCardId(cardId);
    setInstallForm({ description: '', totalAmount: '', installmentCount: '1', entryAmount: '', dueDay: '1', accountId: '', categoryId: '' });
    setIsInstallFormOpen(true);
  };

  const installmentPreview: InstallmentPreview | null = useMemo(() => {
    const total = Number(installForm.totalAmount) || 0;
    const count = Number(installForm.installmentCount) || 1;
    const entry = Number(installForm.entryAmount) || 0;
    if (total <= 0 || count < 1) return null;
    const perMonth = entry > 0 && count > 1
      ? Math.round(((total - entry) / (count - 1)) * 100) / 100
      : Math.round((total / count) * 100) / 100;
    return { entry, perMonth, count, total };
  }, [installForm.totalAmount, installForm.installmentCount, installForm.entryAmount]);

  const handleInstallSubmit = async () => {
    if (!installForm.description || !installForm.totalAmount) {
      addToast('Preencha descrição e valor total', 'error');
      return;
    }
    try {
      await creditCardService.createInstallment(installFormCardId, {
        description: installForm.description,
        totalAmount: Number(installForm.totalAmount),
        installmentCount: Number(installForm.installmentCount),
        entryAmount: installForm.entryAmount ? Number(installForm.entryAmount) : null,
        dueDay: Number(installForm.dueDay),
        accountId: installForm.accountId || null,
        categoryId: installForm.categoryId || null,
      });
      addToast('Compra parcelada adicionada!', 'success');
      setIsInstallFormOpen(false);
      fetchInstallments();
      refreshData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Erro ao adicionar parcela', 'error');
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
    } catch (e: any) {
      addToast('Erro ao remover', 'error');
    }
  };

  const handleCardSaved = () => {
    setIsCardFormOpen(false);
    setEditingCard(null);
    refreshData();
    addToast(editingCard ? 'Cartão atualizado!' : 'Cartão de crédito salvo!', 'success');
  };

  const handleAccountSaved = () => {
    setIsAccountFormOpen(false);
    setEditingAccount(null);
    refreshData();
    addToast(editingAccount ? 'Conta atualizada!' : 'Conta criada!', 'success');
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir a conta '${name}'? Essa ação não pode ser desfeita e pode afetar transações antigas.`)) return;
    setOpenMenuId(null);
    try {
      await api.delete(`/accounts/${id}`);
      addToast('Conta excluída com sucesso!', 'success');
      refreshData();
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      addToast('Erro ao excluir a conta.', 'error');
    }
  };

  const handleDeleteCard = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cartão '${name}'? Essa ação não pode ser desfeita.`)) return;
    setOpenCardMenuId(null);
    try {
      await api.delete(`/credit-cards/${id}`);
      addToast('Cartão excluído com sucesso!', 'success');
      refreshData();
    } catch (error) {
      console.error('Erro ao excluir cartão:', error);
      addToast('Erro ao excluir o cartão.', 'error');
    }
  };

  return {
    isCardFormOpen, isAccountFormOpen, isInstallFormOpen,
    editingAccount, editingCard, installFormCardId, installForm, installmentPreview,
    openMenuId, openCardMenuId, expandedInstallId,
    accounts, creditCards, isLoading, totalBalance, cardInstallments, monthlySummary,
    setIsCardFormOpen, setIsAccountFormOpen, setIsInstallFormOpen,
    setEditingAccount, setEditingCard, setOpenMenuId, setOpenCardMenuId,
    setExpandedInstallId, setInstallForm,
    openInstallModal, handleCardSaved, handleAccountSaved,
    handleDeleteAccount, handleDeleteCard, handleInstallSubmit, handleDeleteInstallment,
    menuRef, cardMenuRef,
  };
}