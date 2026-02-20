import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Account, CreditCard } from '../types';
import { useToast } from '../context/ToastContext';
import { CreditCardForm } from '../components/CreditCardForm';
import { AccountForm } from '../components/AccountForm';

interface AccountsViewProps {
    isPrivacyEnabled: boolean;
}

export const AccountsView: React.FC<AccountsViewProps> = ({ isPrivacyEnabled }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCardFormOpen, setIsCardFormOpen] = useState(false);
    const [isAccountFormOpen, setIsAccountFormOpen] = useState(false);
    const { addToast } = useToast();

    const fetchAccountsAndCards = async () => {
        setIsLoading(true);
        try {
            const [accountsRes, cardsRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/credit-cards')
            ]);
            setAccounts(accountsRes.data);
            setCreditCards(cardsRes.data);
        } catch (error) {
            addToast('Erro ao carregar contas e cartões.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAccountsAndCards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reload icons when data changes
    useEffect(() => {
        //@ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }, [accounts, creditCards, isCardFormOpen, isAccountFormOpen]);

    const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const handleCardSaved = () => {
        setIsCardFormOpen(false);
        fetchAccountsAndCards();
        addToast('Cartão de crédito salvo!', 'success');
    };

    const handleAccountSaved = () => {
        setIsAccountFormOpen(false);
        fetchAccountsAndCards();
        addToast('Conta salva!', 'success');
    };

    if (isLoading) {
        return <div className="animate-pulse space-y-6">
            <div className="h-32 bg-slate-200 rounded-3xl" />
            <div className="h-64 bg-slate-200 rounded-3xl" />
        </div>;
    }

    return (
        <div className="space-y-8 animate-in mt-4 fade-in duration-500">

            {/* Resumo de Contas */}
            <section>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                            <i data-lucide="wallet" className="w-5 h-5"></i>
                        </span>
                        Minhas Contas
                    </h3>
                    <button
                        onClick={() => setIsAccountFormOpen(true)}
                        className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-xl transition-colors"
                    >
                        + Adicionar Conta
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card Total */}
                    <div className="bg-indigo-600 text-white rounded-[2rem] p-8 shadow-xl shadow-indigo-600/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mt-20 -mr-20 blur-3xl group-hover:opacity-10 transition-opacity duration-700"></div>
                        <p className="text-indigo-200 font-bold mb-2">Saldo Consolidado</p>
                        <h4 className="text-4xl font-black tracking-tighter">
                            {isPrivacyEnabled ? 'R$ •••••' : formatCurrency(totalBalance)}
                        </h4>
                    </div>

                    {/* Lista de Contas (Cards) */}
                    {accounts.map(acc => (
                        <div key={acc.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-slate-200/60 transition-all duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center border border-slate-100">
                                    <i data-lucide={acc.type === 'CHECKING' ? 'landmark' : acc.type === 'WALLET' ? 'banknote' : 'piggy-bank'} className="w-6 h-6"></i>
                                </div>
                                <button className="text-slate-300 hover:text-indigo-500 transition-colors">
                                    <i data-lucide="more-vertical" className="w-5 h-5"></i>
                                </button>
                            </div>
                            <h5 className="text-lg font-bold text-slate-800 mb-1">{acc.name}</h5>
                            <p className="text-sm text-slate-400 font-medium mb-4">{
                                acc.type === 'CHECKING' ? 'Conta Corrente' :
                                    acc.type === 'SAVINGS' ? 'Conta Poupança' :
                                        acc.type === 'WALLET' ? 'Carteira (Dinheiro)' : 'Corretora'
                            }</p>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">
                                {isPrivacyEnabled ? 'R$ •••••' : formatCurrency(Number(acc.balance))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Resumo de Cartões de Crédito */}
            <section className="pt-8 border-t border-slate-200">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <span className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                            <i data-lucide="credit-card" className="w-5 h-5"></i>
                        </span>
                        Cartões de Crédito
                    </h3>
                    <button
                        onClick={() => setIsCardFormOpen(true)}
                        className="text-sm font-bold text-orange-600 hover:text-orange-800 bg-orange-50 px-4 py-2 rounded-xl transition-colors"
                    >
                        + Adicionar Cartão
                    </button>
                </div>

                {creditCards.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                        <div className="w-16 h-16 bg-white mx-auto rounded-3xl flex items-center justify-center shadow-lg shadow-slate-200/50 mb-6 border border-slate-100">
                            <i data-lucide="credit-card" className="w-8 h-8 text-slate-300"></i>
                        </div>
                        <h4 className="text-lg font-black text-slate-800 mb-2">Nenhum cartão cadastrado</h4>
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">Adicione cartões de crédito para acompanhar seus limites e planejar as faturas futuras.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {creditCards.map(card => (
                            <div key={card.id} className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-900/20 overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mt-10 -mr-10"></div>

                                <div className="flex justify-between items-start mb-12">
                                    <div>
                                        <h5 className="text-xl font-black tracking-wide">{card.name}</h5>
                                        <p className="text-slate-400 text-xs font-semibold mt-1">
                                            Débito aut. na conta: {card.account?.name || 'Não associado'}
                                        </p>
                                    </div>
                                    <i data-lucide="contactless-payment" className="w-8 h-8 text-white/50"></i>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-1">Limite do Cartão</p>
                                        <p className="text-2xl font-black tracking-tight">
                                            {isPrivacyEnabled ? '•••••' : formatCurrency(Number(card.limit))}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white/60 text-[10px] uppercase font-bold mb-1">Corte / Venc</p>
                                        <p className="text-lg font-medium tracking-widest">{card.closingDay} / {card.dueDay}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {isCardFormOpen && (
                <CreditCardForm
                    accounts={accounts}
                    onSave={handleCardSaved}
                    onClose={() => setIsCardFormOpen(false)}
                />
            )}

            {isAccountFormOpen && (
                <AccountForm
                    onSave={handleAccountSaved}
                    onClose={() => setIsAccountFormOpen(false)}
                />
            )}

        </div>
    );
};
