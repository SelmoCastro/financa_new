import React, { useState, useEffect } from 'react';
import { X, CreditCard as CreditCardIcon } from 'lucide-react';
import { Account, CreditCard } from '../types';
import api from '../services/api';
import { useCurrency } from '../context/CurrencyContext';

interface CreditCardFormProps {
    accounts: Account[];
    cardToEdit?: CreditCard | null;
    onSave: () => void;
    onClose: () => void;
}

export const CreditCardForm: React.FC<CreditCardFormProps> = ({ accounts, cardToEdit, onSave, onClose }) => {
    const [name, setName] = useState(cardToEdit?.name || '');
    const [limit, setLimit] = useState(cardToEdit?.limit ? String(cardToEdit.limit) : '');
    const [closingDay, setClosingDay] = useState(cardToEdit?.closingDay ? String(cardToEdit.closingDay) : '');
    const [dueDay, setDueDay] = useState(cardToEdit?.dueDay ? String(cardToEdit.dueDay) : '');
    const [accountId, setAccountId] = useState(cardToEdit?.accountId || '');
    const [isLoading, setIsLoading] = useState(false);
    const { currencySymbol } = useCurrency();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const dataPayload = {
                name,
                limit: Number(limit),
                closingDay: Number(closingDay),
                dueDay: Number(dueDay),
                accountId
            };

            if (cardToEdit) {
                await api.patch(`/credit-cards/${cardToEdit.id}`, dataPayload);
            } else {
                await api.post('/credit-cards', dataPayload);
            }
            onSave();
        } catch (error) {
            console.error('Erro ao salvar cartão', error);
            alert('Erro ao salvar cartão. Verifique os dados.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                <div className="px-8 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Pagamentos</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                                <CreditCardIcon className="w-6 h-6" />
                            </div>
                            {cardToEdit ? 'Editar Cartão' : 'Novo Cartão'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all active:scale-95">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Identificação do Cartão</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                            placeholder="Ex: Nubank, Itaú Black..."
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Limite do Cartão</label>
                        <div className="relative group">
                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-black text-lg pointer-events-none group-focus-within:text-indigo-500 transition-colors">{currencySymbol}</span>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={limit}
                                onChange={e => setLimit(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl pl-14 pr-6 py-5 text-slate-800 dark:text-white font-black text-2xl tracking-tighter focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                placeholder="0,00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Fechamento</label>
                            <input
                                type="number"
                                min="1" max="31"
                                required
                                value={closingDay}
                                onChange={e => setClosingDay(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                placeholder="Dia"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Vencimento</label>
                            <input
                                type="number"
                                min="1" max="31"
                                required
                                value={dueDay}
                                onChange={e => setDueDay(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                                placeholder="Dia"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Débito em Conta</label>
                        <div className="relative group">
                            <select
                                required
                                value={accountId}
                                onChange={e => setAccountId(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none transition-all cursor-pointer"
                            >
                                <option value="" disabled>Selecione uma conta...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                <i data-lucide="chevron-down" className="w-4 h-4"></i>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-6 py-5 text-white font-black uppercase tracking-widest text-[10px] bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-xl shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Salvando...' : 'Salvar Cartão'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
