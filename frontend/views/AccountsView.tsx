import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import { Account, CreditCard } from '../types';
import { useToast } from '../context/ToastContext';
import { CreditCardForm } from '../components/CreditCardForm';
import { AccountForm } from '../components/AccountForm';
import { BankIcon } from '../components/BankIcon';
import { useData } from '../context/DataProvider';
import { useCurrency } from '../context/CurrencyContext';
import { Wallet, Sparkles, Plus, MoreVertical, Edit3, Trash2, CreditCard as CreditCardIcon, Nfc, ShoppingBag, X, ChevronDown, ChevronUp } from 'lucide-react';
import { creditCardService, CreditCardInstallmentDTO, computeSchedule, formatMonth } from '../services/creditCardService';

interface AccountsViewProps {
    isPrivacyEnabled: boolean;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ isPrivacyEnabled }) => {
    const [isCardFormOpen, setIsCardFormOpen] = useState(false);
    const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);
    const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
    const [cardInstallments, setCardInstallments] = useState<Record<string, CreditCardInstallmentDTO[]>>({});
    const [isInstallFormOpen, setIsInstallFormOpen] = useState(false);
    const [installFormCardId, setInstallFormCardId] = useState('');
    const [installForm, setInstallForm] = useState({ description: '', totalAmount: '', installmentCount: '1', entryAmount: '', dueDay: '1', accountId: '', categoryId: '' });
    const [expandedInstallId, setExpandedInstallId] = useState<string | null>(null);
    const { addToast } = useToast();
    const { accounts, creditCards, isLoading, refreshData } = useData();
    const { formatCurrency } = useCurrency();

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
    const monthlySummary = useMemo(() => {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();
      
      // Flatten all installments from all cards
      const allInstallments: CreditCardInstallmentDTO[] = Object.values(cardInstallments).flat();
      
      // Group by month/year
      const groupedByMonth: Record<string, {
        key: string;
        month: number;
        year: number;
        total: number;
        items: Array<{
          description: string;
          amount: number;
          cardName: string;
          installmentNumber: number;
        }>
      }> = {};
      
      allInstallments.forEach(inst => {
        // Skip if not active
        if (!inst.isActive) return;
        
        // Compute schedule for this installment
        const schedule = computeSchedule({
          installmentCount: inst.installmentCount,
          totalAmount: inst.totalAmount,
          amountPerMonth: inst.amountPerMonth,
          entryAmount: inst.entryAmount,
          startDate: inst.startDate,
          dueDay: inst.dueDay
        });
        
        // Add only future installments (not yet paid)
        schedule.forEach(schedItem => {
          // Check if this installment is in the future or current month
          const installmentDate = new Date(schedItem.year, schedItem.month - 1, 1);
          const currentMonthDate = new Date(currentYear, currentMonth - 1, 1);
          
          // Only include if installment is >= current month AND installment number > currentInstallment (not paid yet)
          if (installmentDate >= currentMonthDate && schedItem.installmentNumber > inst.currentInstallment) {
            const monthKey = `${schedItem.month}/${schedItem.year}`;
            
            if (!groupedByMonth[monthKey]) {
              groupedByMonth[monthKey] = {
                key: monthKey,
                month: schedItem.month,
                year: schedItem.year,
                total: 0,
                items: []
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
      
      // Convert to array and sort by date
      const summaryArray = Object.values(groupedByMonth)
        .sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        });
      
      return summaryArray;
    }, [cardInstallments]);

    const openInstallModal = (cardId: string) => {
      setInstallFormCardId(cardId);
      setInstallForm({ description: '', totalAmount: '', installmentCount: '1', entryAmount: '', dueDay: '1', accountId: '', categoryId: '' });
      setIsInstallFormOpen(true);
    };

    // Preview of installment values while typing
    const installmentPreview = useMemo(() => {
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


    // Removed local fetch favor of global DataProvider refreshData
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

    if (isLoading) {
        return <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
            <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl" />
        </div>;
    }

    return (
        <>
            <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Resumo de Contas */}
                <section>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Patrimônio</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                                Minhas Contas
                            </h3>
                        </div>
                        <button
                            onClick={() => setIsAccountFormOpen(true)}
                            className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-500/10 bg-cyan-50 dark:bg-slate-900 px-6 py-3 rounded-2xl transition-all active:scale-95 border border-cyan-100 dark:border-cyan-500/20"
                        >
                            + Adicionar Conta
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {/* Card Total */}
                        <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-[2.5rem] p-8 shadow-xl shadow-cyan-600/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mt-20 -mr-20 blur-3xl group-hover:opacity-20 transition-all duration-700"></div>
                            <p className="text-cyan-100 font-black uppercase tracking-[0.2em] text-[10px] mb-4 relative z-10">Saldo Consolidado</p>
                            <h4 className="text-4xl font-black tracking-tighter relative z-10">
                                {isPrivacyEnabled ? '•••••' : formatCurrency(totalBalance)}
                            </h4>
                            <div className="mt-8 flex items-center gap-2 relative z-10">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Wallet className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest">{accounts.length} contas ativas</span>
                            </div>
                        </div>

                        {/* Lista de Contas (Cards) */}
                        {accounts.length === 0 ? (
                            <div className="md:col-span-1 lg:col-span-2 flex flex-col items-center justify-center p-8 glass-card border-dashed border-cyan-200 dark:border-cyan-500/30 rounded-[2.5rem] text-center">
                                <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6">
                                    <Sparkles className="w-8 h-8 text-cyan-400" />
                                </div>
                                <h4 className="text-lg font-black text-slate-800 dark:text-white mb-2">Sua primeira Conta!</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-8 font-medium leading-relaxed">Você precisa adicionar pelo menos uma conta bancária ou carteira para conseguir registrar seus primeiros lançamentos.</p>
                                <button
                                    onClick={() => setIsAccountFormOpen(true)}
                                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-cyan-600/20 active:scale-95 flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Criar Conta Agora
                                </button>
                            </div>
                        ) : (
                            accounts.map(acc => (
                                <div key={acc.id} className="glass-card rounded-[2.5rem] p-8 hover:translate-y-[-4px] transition-all duration-300 group" style={{ overflow: 'visible' }}>
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="p-1 bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                            <BankIcon name={acc.name} type={acc.type} />
                                        </div>
                                        <div className="relative z-40">
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === acc.id ? null : acc.id)}
                                                className="text-slate-400 dark:text-slate-500 hover:text-cyan-500 transition-all p-2 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>

                                            {openMenuId === acc.id && (
                                                <div ref={menuRef} className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 p-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingAccount(acc);
                                                            setIsAccountFormOpen(true);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all flex items-center gap-3 rounded-xl"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                        Editar Conta
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                                        className="w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-3 rounded-xl"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        Excluir Conta
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1 mb-6">
                                        <h5 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{acc.name}</h5>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{
                                            acc.type === 'CHECKING' ? 'Conta Corrente' :
                                                acc.type === 'SAVINGS' ? 'Conta Poupança' :
                                                    acc.type === 'WALLET' ? 'Carteira (Dinheiro)' : 'Corretora'
                                        }</p>
                                    </div>
                                    <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {isPrivacyEnabled ? '•••••' : formatCurrency(Number(acc.balance))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Resumo de Cartões de Crédito */}
                <section className="pt-12 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Meios de Pagamento</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                                Cartões de Crédito
                            </h3>
                        </div>
                        <button
                            onClick={() => setIsCardFormOpen(true)}
                            className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/10 bg-orange-50 dark:bg-slate-900 px-6 py-3 rounded-2xl transition-all active:scale-95 border border-orange-100 dark:border-orange-500/20"
                        >
                            + Adicionar Cartão
                        </button>
                    </div>

                    {creditCards.length === 0 ? (
                        <div className="glass-card border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-16 text-center">
                            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 mx-auto rounded-[2rem] flex items-center justify-center shadow-sm mb-8 border border-slate-100 dark:border-slate-800">
                                <CreditCardIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Nenhum cartão cadastrado</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">Adicione seus cartões de crédito para acompanhar limites, faturas e datas de vencimento de forma inteligente.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {creditCards.map(card => (
                                <div key={card.id} className="relative bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl shadow-slate-900/40 overflow-hidden group hover:translate-y-[-4px] transition-all duration-300 border border-white/5" style={{ overflow: 'visible' }}>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mt-20 -mr-20 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>

                                    <div className="flex justify-between items-start mb-16 relative z-10">
                                        <div>
                                            <h5 className="text-2xl font-black tracking-tight mb-2">{card.name}</h5>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Débito em:</span>
                                                <span className="text-[10px] font-bold text-slate-300">{card.account?.name || 'Não associado'}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10 backdrop-blur-sm">
                                                <div className="w-6 h-4 bg-amber-400/40 rounded-sm"></div>
                                            </div>
                                            <div className="relative z-40">
                                                <button
                                                    onClick={() => setOpenCardMenuId(openCardMenuId === card.id ? null : card.id)}
                                                    className="text-white/30 hover:text-white transition-all p-2 rounded-xl hover:bg-white/10"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>

                                                {openCardMenuId === card.id && (
                                                    <div ref={cardMenuRef} className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 p-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCard(card);
                                                                setIsCardFormOpen(true);
                                                                setOpenCardMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all flex items-center gap-3 rounded-xl"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                            Editar Cartão
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCard(card.id, card.name)}
                                                            className="w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-3 rounded-xl"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Excluir Cartão
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end relative z-10">
                                        <div className="space-y-1">
                                            <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Limite Total</p>
                                            <p className="text-3xl font-black tracking-tighter">
                                                {isPrivacyEnabled ? '•••••' : formatCurrency(Number(card.limit))}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-sm">
                                                <p className="text-white/40 text-[8px] uppercase font-black tracking-widest mb-0.5">Fech. / Venc.</p>
                                                <p className="text-sm font-black tracking-[0.2em]">{card.closingDay} / {card.dueDay}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between relative z-10">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-800 bg-slate-700"></div>
                                        ))}
                                    </div>
                                    <Nfc className="w-6 h-6 text-white/20" />
                                </div>

                                {/* ── Installments Section ── */}
                                <div className="mt-6 pt-6 border-t border-white/10 relative z-10">
                                  <div className="flex items-center justify-between mb-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
                                      <ShoppingBag className="w-3 h-3" /> Compras Parceladas
                                    </p>
                                    <button
                                      onClick={() => openInstallModal(card.id)}
                                      className="text-[8px] font-black uppercase tracking-wider text-cyan-400 hover:text-cyan-300 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-all"
                                    >
                                      + Nova
                                    </button>
                                  </div>

                                  {(!cardInstallments[card.id] || cardInstallments[card.id].length === 0) ? (
                                    <p className="text-[10px] text-white/30 italic">Nenhuma compra parcelada</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {cardInstallments[card.id].map(inst => {
                                        const isExpanded = expandedInstallId === inst.id;
                                        const schedule = computeSchedule(inst);
                                        const entryAmount = inst.entryAmount ? Number(inst.entryAmount) : 0;
                                        const hasEntry = entryAmount > 0;

                                        return (
                                          <div key={inst.id} className="bg-white/5 rounded-xl overflow-hidden">
                                            {/* Header row - click to expand */}
                                            <button
                                              onClick={() => setExpandedInstallId(isExpanded ? null : inst.id)}
                                              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-all"
                                            >
                                              <div className="min-w-0 flex-1">
                                                <p className="text-[11px] font-bold text-slate-700 dark:text-white truncate">{inst.description}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <span className="text-[10px] font-black text-cyan-300">
                                                    {isPrivacyEnabled ? '•••••' : formatCurrency(hasEntry ? entryAmount : Number(inst.amountPerMonth))}
                                                  </span>
                                                  {hasEntry && (
                                                    <span className="text-[8px] font-bold text-amber-300/70 bg-amber-400/10 px-1.5 py-0.5 rounded">
                                                      entrada
                                                    </span>
                                                  )}
                                                  <span className="text-[9px] text-white/40">
                                                    {inst.currentInstallment}/{inst.installmentCount}
                                                  </span>
                                                  <div className="flex-1 h-1 bg-white/10 rounded-full max-w-[60px]">
                                                    <div
                                                      className="h-full bg-cyan-500/60 rounded-full transition-all"
                                                      style={{ width: `${(inst.currentInstallment / inst.installmentCount) * 100}%` }}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="flex items-center gap-1 ml-2">
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleDeleteInstallment(inst.id); }}
                                                  className="p-1 text-white/30 hover:text-rose-400 transition-all"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                                {isExpanded
                                                  ? <ChevronUp className="w-3.5 h-3.5 text-white/30" />
                                                  : <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                                                }
                                              </div>
                                            </button>

                                            {/* Expanded: installment schedule */}
                                            {isExpanded && schedule.length > 0 && (
                                              <div className="px-3 pb-2 border-t border-white/5 pt-2">
                                                <div className="space-y-1">
                                                  {schedule.map(s => {
                                                    const isPaid = s.installmentNumber <= inst.currentInstallment;
                                                    return (
                                                      <div key={s.installmentNumber} className="flex items-center justify-between text-[10px] py-1 px-1">
                                                        <div className="flex items-center gap-2">
                                                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${isPaid ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
                                                            {s.installmentNumber}
                                                          </span>
                                                          <span className={`font-medium ${isPaid ? 'text-white/50 line-through' : 'text-white/70'}`}>
                                                            {formatMonth(s.month)}/{s.year.toString().slice(2)}
                                                          </span>
                                                        </div>
                                                        <span className={`font-bold ${isPaid ? 'text-white/30 line-through' : s.installmentNumber === 1 && hasEntry ? 'text-amber-300' : 'text-cyan-300'}`}>
                                                          {isPrivacyEnabled ? '•••••' : formatCurrency(s.amount)}
                                                        </span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                                {/* Total */}
                                                <div className="flex items-center justify-between text-[10px] mt-2 pt-2 border-t border-white/10 px-1">
                                                  <span className="font-bold text-white/50">Total</span>
                                                  <span className="font-black text-white">
                                                    {isPrivacyEnabled ? '•••••' : formatCurrency(Number(inst.totalAmount))}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                            </div>
                            ))}
                        </div>
                    )}
                </section>

            {/* Resumo Mensal de Parcelas */}
            <section className="pt-12 border-t border-slate-200 dark:border-slate-800">
             <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                 <div>
                     <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Planejamento</p>
                     <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
                         Resumo Mensal
                     </h3>
                 </div>
             </div>

             {monthlySummary.length === 0 ? (
                 <div className="glass-card border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-16 text-center">
                     <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 mx-auto rounded-[2rem] flex items-center justify-center shadow-sm mb-8 border border-slate-100 dark:border-slate-800">
                         <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                     </div>
                     <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Nenhuma parcela pendente</h4>
                     <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">Todas as suas parcelas estão em dia ou não há compras parceladas agendadas para o futuro.</p>
                 </div>
             ) : (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                     {monthlySummary.map(month => {
                         const monthName = formatMonth(month.month);
                         const isCurrentMonth = month.month === new Date().getMonth() + 1 && month.year === new Date().getFullYear();
                         
                         return (
                             <div key={month.key} className="glass-card rounded-[2rem] p-6 hover:translate-y-[-2px] transition-all duration-300 group border border-slate-200 dark:border-white/10">
                                 <div className="flex items-center justify-between mb-4">
                                     <div className="flex items-center gap-2">
                                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isCurrentMonth ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/40'}`}>
                                             <span className="text-[10px] font-black uppercase tracking-widest">{monthName}</span>
                                         </div>
                                         <h4 className="text-lg font-black text-slate-800 dark:text-white">
                                             {monthName} {month.year}
                                         </h4>
                                     </div>
                                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isCurrentMonth ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-white/50'}`}>
                                         {isCurrentMonth ? 'Mês Atual' : 'Futuro'}
                                     </span>
                                 </div>
                                 
                                 <div className="mt-4">
                                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Total do Mês</p>
                                     <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                         {isPrivacyEnabled ? '•••••' : formatCurrency(month.total)}
                                     </p>
                                 </div>
                                 
                                 {/* Expandable items list */}
                                 <div className="mt-4">
                                      <button
                                          onClick={() => setExpandedInstallId(`month-${month.key}`)}
                                          className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-50 dark:bg-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/20 transition-all"
                                      >
                                         <div className="flex-1">
                                            <p className="text-[11px] font-bold text-slate-700 dark:text-white truncate">
                                                Ver {month.items.length} parcela{month.items.length !== 1 ? 's' : ''} deste mês
                                             </p>
                                         </div>
                                         <div className="flex items-center gap-1">
                                              {expandedInstallId === `month-${month.key}` ? (
                                                  <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                                              ) : (
                                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                                              )}
                                         </div>
                                     </button>
                                     
                                     {expandedInstallId === `month-${month.key}` && (
                                         <div className="mt-3 space-y-2">
                                              {month.items.map(item => (
                                                  <div key={`${month.key}-${item.installmentNumber}`} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                                                      <div className="flex-1">
                                                          <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                                                              {item.description}
                                                          </p>
                                                          <p className="text-[9px] text-slate-500 dark:text-white/50 truncate">
                                                              {item.cardName} - {item.installmentNumber}x
                                                          </p>
                                                      </div>
                                                      <span className="font-bold text-slate-900 dark:text-white">
                                                          {isPrivacyEnabled ? '•••••' : formatCurrency(item.amount)}
                                                      </span>
                                                  </div>
                                              ))}
                                         </div>
                                     )}
                                 </div>
                             </div>
                         );
                     })}
                 </div>
            )}
            </section>
            </div>

            {isCardFormOpen && (
                <CreditCardForm
                    accounts={accounts}
                    cardToEdit={editingCard}
                    onSave={handleCardSaved}
                    onClose={() => {
                        setIsCardFormOpen(false);
                        setEditingCard(null);
                    }}
                />
            )}

            {isAccountFormOpen && (
                <AccountForm
                    accountToEdit={editingAccount}
                    onSave={handleAccountSaved}
                    onClose={() => {
                        setIsAccountFormOpen(false);
                        setEditingAccount(null);
                    }}
                />
            )}

                    {/* Installment Form Modal */}
                    {isInstallFormOpen && (
                      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
                          <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-cyan-50/50 dark:bg-slate-950/50 flex items-center justify-between">
                            <h2 className="text-lg font-black text-slate-900 dark:text-white">Nova Compra Parcelada</h2>
                            <button onClick={() => setIsInstallFormOpen(false)} className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="p-6 space-y-4">
                            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Descrição</label>
                            <input className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500" placeholder="Descrição (ex: Notebook, Geladeira)" value={installForm.description} onChange={e => setInstallForm({...installForm, description: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Valor total (R$)</label>
                                <input type="number" step="0.01" min="0" className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-slate-900 dark:text-white" placeholder="Valor total" value={installForm.totalAmount} onChange={e => setInstallForm({...installForm, totalAmount: e.target.value})} />
                              </div>
                              <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Número de parcelas</label>
                                <input type="number" min="1" className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-slate-900 dark:text-white" placeholder="N° parcelas" value={installForm.installmentCount} onChange={e => setInstallForm({...installForm, installmentCount: e.target.value})} />
                              </div>
                            </div>
                            {/* Entry amount field */}
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Valor da entrada (opcional)</label>
                              <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-2">Primeira parcela (deixa 0 se não houver entrada)</p>
                              <input type="number" step="0.01" min="0" className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-slate-900 dark:text-white" placeholder="Valor da entrada (opcional)" value={installForm.entryAmount} onChange={e => setInstallForm({...installForm, entryAmount: e.target.value})} />
                            </div>
                            <div>
                              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Dia do vencimento</label>
                              <input type="number" min="1" max="31" className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-slate-900 dark:text-white" placeholder="Dia do vencimento" value={installForm.dueDay} onChange={e => setInstallForm({...installForm, dueDay: e.target.value})} />
                            </div>

                    {/* Live preview of installment values */}
                    {installmentPreview && (
                      <div className="bg-cyan-50 dark:bg-cyan-500/10 rounded-xl p-3 space-y-1.5 border border-cyan-100 dark:border-cyan-500/20">
                        <p className="text-[9px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1">Prévia das parcelas</p>
                        {installmentPreview.entry > 0 && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-amber-600 dark:text-amber-400 font-bold">Entrada</span>
                            <span className="font-black text-amber-700 dark:text-amber-300">{formatCurrency(installmentPreview.entry)}</span>
                          </div>
                        )}
                        {installmentPreview.count > (installmentPreview.entry > 0 ? 1 : 0) && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-600 dark:text-slate-300 font-bold">
                              {installmentPreview.entry > 0 ? `${installmentPreview.count - 1}x de` : `${installmentPreview.count}x de`}
                            </span>
                            <span className="font-black text-cyan-700 dark:text-cyan-300">{formatCurrency(installmentPreview.perMonth)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px] pt-1.5 border-t border-cyan-200 dark:border-cyan-500/20">
                          <span className="font-bold text-slate-600 dark:text-slate-300">Total</span>
                          <span className="font-black text-slate-800 dark:text-white">{formatCurrency(installmentPreview.total)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setIsInstallFormOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl">Cancelar</button>
                      <button onClick={handleInstallSubmit} className="flex-[2] py-3 text-[10px] font-black uppercase tracking-widest bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 shadow-lg shadow-cyan-600/20">Adicionar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
        </>
    );
};