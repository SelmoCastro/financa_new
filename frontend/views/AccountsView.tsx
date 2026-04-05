import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { Account, CreditCard } from '../types';
import { useToast } from '../context/ToastContext';
import { CreditCardForm } from '../components/CreditCardForm';
import { AccountForm } from '../components/AccountForm';
import { BankIcon } from '../components/BankIcon';
import { useData } from '../context/DataProvider';
import { useCurrency } from '../context/CurrencyContext';

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
    const { addToast } = useToast();
    const { accounts, creditCards, isLoading, refreshData } = useData();
    const { formatCurrency } = useCurrency();

    // Reload icons when data changes
    useEffect(() => {
        //@ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }, [accounts, creditCards, isCardFormOpen, isAccountFormOpen, openMenuId, openCardMenuId]);

    const totalBalance = useMemo(() => accounts.reduce((acc, curr) => acc + Number(curr.balance), 0), [accounts]);


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
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {(openMenuId || openCardMenuId) && (
                <div className="fixed inset-0 z-30" onClick={() => { setOpenMenuId(null); setOpenCardMenuId(null); }}></div>
            )}

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
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/10 bg-indigo-50 dark:bg-slate-900 px-6 py-3 rounded-2xl transition-all active:scale-95 border border-indigo-100 dark:border-indigo-500/20"
                    >
                        + Adicionar Conta
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {/* Card Total */}
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-[2.5rem] p-8 shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mt-20 -mr-20 blur-3xl group-hover:opacity-20 transition-all duration-700"></div>
                        <p className="text-indigo-100 font-black uppercase tracking-[0.2em] text-[10px] mb-4 relative z-10">Saldo Consolidado</p>
                        <h4 className="text-4xl font-black tracking-tighter relative z-10">
                            {isPrivacyEnabled ? '•••••' : formatCurrency(totalBalance)}
                        </h4>
                        <div className="mt-8 flex items-center gap-2 relative z-10">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <i data-lucide="wallet" className="w-4 h-4 text-white"></i>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-100 uppercase tracking-widest">{accounts.length} contas ativas</span>
                        </div>
                    </div>

                    {/* Lista de Contas (Cards) */}
                    {accounts.length === 0 ? (
                        <div className="md:col-span-1 lg:col-span-2 flex flex-col items-center justify-center p-8 glass-card border-dashed border-indigo-200 dark:border-indigo-500/30 rounded-[2.5rem] text-center">
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6">
                                <i data-lucide="sparkles" className="w-8 h-8 text-indigo-400"></i>
                            </div>
                            <h4 className="text-lg font-black text-slate-800 dark:text-white mb-2">Sua primeira Conta!</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-8 font-medium leading-relaxed">Você precisa adicionar pelo menos uma conta bancária ou carteira para conseguir registrar seus primeiros lançamentos.</p>
                            <button
                                onClick={() => setIsAccountFormOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                            >
                                <i data-lucide="plus" className="w-4 h-4"></i>
                                Criar Conta Agora
                            </button>
                        </div>
                    ) : (
                        accounts.map(acc => (
                            <div key={acc.id} className="glass-card rounded-[2.5rem] p-8 hover:translate-y-[-4px] transition-all duration-300 group">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-1 bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                                        <BankIcon name={acc.name} type={acc.type} />
                                    </div>
                                    <div className="relative z-40">
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === acc.id ? null : acc.id)}
                                            className="text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-all p-2 bg-slate-50 dark:bg-slate-900 rounded-xl"
                                        >
                                            <i data-lucide="more-vertical" className="w-5 h-5"></i>
                                        </button>

                                        {openMenuId === acc.id && (
                                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 p-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingAccount(acc);
                                                        setIsAccountFormOpen(true);
                                                        setOpenMenuId(null);
                                                    }}
                                                    className="w-full text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center gap-3 rounded-xl"
                                                >
                                                    <i data-lucide="edit-3" className="w-4 h-4"></i>
                                                    Editar Conta
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                                    className="w-full text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-3 rounded-xl"
                                                >
                                                    <i data-lucide="trash-2" className="w-4 h-4"></i>
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
                            <i data-lucide="credit-card" className="w-10 h-10 text-slate-300 dark:text-slate-600"></i>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Nenhum cartão cadastrado</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">Adicione seus cartões de crédito para acompanhar limites, faturas e datas de vencimento de forma inteligente.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {creditCards.map(card => (
                            <div key={card.id} className="relative bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl shadow-slate-900/40 overflow-hidden group hover:translate-y-[-4px] transition-all duration-300 border border-white/5">
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
                                                <i data-lucide="more-vertical" className="w-5 h-5"></i>
                                            </button>

                                            {openCardMenuId === card.id && (
                                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 p-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingCard(card);
                                                            setIsCardFormOpen(true);
                                                            setOpenCardMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-3 rounded-xl"
                                                    >
                                                        <i data-lucide="edit-3" className="w-4 h-4"></i>
                                                        Editar Cartão
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCard(card.id, card.name)}
                                                        className="w-full text-left px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center gap-3 rounded-xl"
                                                    >
                                                        <i data-lucide="trash-2" className="w-4 h-4"></i>
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
                                    <i data-lucide="contactless-payment" className="w-6 h-6 text-white/20"></i>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

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

        </div>
    );
};
