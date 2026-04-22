import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, X, ArrowUpRight, ArrowDownLeft, Wallet, Tag, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { useData } from '../context/DataProvider';
import { useToast } from '../context/ToastContext';
import { useCurrency } from '../context/CurrencyContext';

export const NotificationCenter: React.FC = () => {
    const [invites, setInvites] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { refreshData, accounts, categories } = useData();
    const { addToast } = useToast();
    const { formatCurrency } = useCurrency();

    // Acceptance state
    const [acceptingId, setAcceptingId] = useState<string | null>(null);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    
    const knownInviteIds = useRef<Set<string>>(new Set());

    const fetchInvites = async () => {
        try {
            const res = await api.get('/social/invites');
            const newInvites = res.data;
            setInvites(newInvites);
            
            // Auto open if there is any array of new invites
            let hasNew = false;
            newInvites.forEach((inv: any) => {
                if (!knownInviteIds.current.has(inv.id)) {
                    hasNew = true;
                    knownInviteIds.current.add(inv.id);
                }
            });
            
            if (hasNew) {
                setIsOpen(true);
            }
        } catch (err) {
            console.error('Failed to fetch invites', err);
        }
    };

    useEffect(() => {
        fetchInvites();
        const interval = setInterval(fetchInvites, 60000); // 1 minute polling
        return () => clearInterval(interval);
    }, []);

    const handleAccept = async (inviteId: string) => {
        if (!selectedAccount || !selectedCategory) {
            addToast('Selecione uma conta e categoria', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.post(`/social/invites/${inviteId}/accept`, {
                accountId: selectedAccount,
                categoryId: selectedCategory
            });
            addToast('Lançamento aceito com sucesso!', 'success');
            setInvites(invites.filter(i => i.id !== inviteId));
            setAcceptingId(null);
            refreshData();
            
            if (invites.length <= 1) {
                setIsOpen(false);
            }
        } catch (err) {
            addToast('Falha ao aceitar lançamento', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async (inviteId: string) => {
        try {
            await api.patch(`/social/invites/${inviteId}/reject`);
            setInvites(invites.filter(i => i.id !== inviteId));
            addToast('Convite recusado', 'info');
            
            if (invites.length <= 1) {
                setIsOpen(false);
            }
        } catch (err) {
            addToast('Falha ao recusar', 'error');
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 md:p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95 shadow-sm"
            >
                <Bell className="w-4 h-4 md:w-5 h-5" />
                {invites.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                )}
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300 transition-all">
                    <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <button onClick={() => setIsOpen(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-all active:scale-95 z-20">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-slate-950/50 text-center relative shrink-0">
                           <div className="w-20 h-20 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-[2rem] flex items-center justify-center mx-auto mb-6 relative z-10 border border-indigo-100 dark:border-indigo-500/20">
                               <Bell className="w-10 h-10 animate-bounce" />
                           </div>
                           <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-[0.3em] mb-2 relative z-10">Central de Ações</p>
                           <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight relative z-10">Notificações</h2>
                           <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10 mt-2">Você tem {invites.length} {invites.length === 1 ? 'pendência' : 'pendências'} para revisar</p>
                        </div>

                        <div className="overflow-y-auto p-6 space-y-6">
                            {invites.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 space-y-4">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center mx-auto opacity-50">
                                        <Bell className="w-8 h-8" />
                                    </div>
                                    <p className="text-sm font-black uppercase tracking-widest opacity-60">Tudo limpo por aqui!</p>
                                </div>
                            ) : (
                                invites.map((invite) => (
                                    <div key={invite.id} className="p-6 border border-slate-100 dark:border-slate-800 rounded-[2rem] bg-white dark:bg-slate-950/50 shadow-sm hover:border-indigo-100 dark:hover:border-indigo-500/30 transition-all duration-300">
                                        <div className="flex items-start gap-4 mb-6">
                                            <div className={`p-3.5 rounded-2xl shadow-sm ${invite.type === 'EXPENSE' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                {invite.type === 'EXPENSE' ? <ArrowDownLeft className="w-6 h-6" /> : <ArrowUpRight className="w-6 h-6" />}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <p className="text-sm font-black text-slate-800 dark:text-white leading-tight tracking-tight">
                                                    {invite.sender?.name || invite.sender?.email}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                    {invite.description}
                                                </p>
                                                <p className="font-black text-slate-900 dark:text-white mt-2 text-xl tracking-tighter">
                                                    {formatCurrency(invite.amount)}
                                                </p>
                                            </div>
                                        </div>

                                        {acceptingId === invite.id ? (
                                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 space-y-4 border border-slate-100 dark:border-slate-800 animate-in fade-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                                        <Wallet className="w-3 h-3" /> Conta de Destino
                                                    </div>
                                                    <div className="relative group">
                                                        <select
                                                            className="w-full text-sm p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer font-bold text-slate-700 dark:text-white appearance-none"
                                                            value={selectedAccount}
                                                            onChange={(e) => setSelectedAccount(e.target.value)}
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {accounts.map(acc => (
                                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <ChevronDown className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">
                                                        <Tag className="w-3 h-3" /> Categoria Sugerida
                                                    </div>
                                                    <div className="relative group">
                                                        <select
                                                            className="w-full text-sm p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer font-bold text-slate-700 dark:text-white appearance-none"
                                                            value={selectedCategory}
                                                            onChange={(e) => setSelectedCategory(e.target.value)}
                                                        >
                                                            <option value="">Selecione...</option>
                                                            {categories.filter(c => c.type === invite.type).map(cat => (
                                                                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <ChevronDown className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        onClick={() => setAcceptingId(null)}
                                                        className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all border border-slate-200 dark:border-slate-700 active:scale-95"
                                                    >
                                                        Voltar
                                                    </button>
                                                    <button
                                                        onClick={() => handleAccept(invite.id)}
                                                        disabled={loading}
                                                        className="flex-[2] py-3 text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95"
                                                    >
                                                        {loading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                                        Confirmar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setAcceptingId(invite.id)}
                                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20"
                                                >
                                                    <Check className="w-4 h-4" /> ACEITAR
                                                </button>
                                                <button
                                                    onClick={() => handleReject(invite.id)}
                                                    className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white transition-all active:scale-95 flex items-center justify-center"
                                                >
                                                    <X className="w-4 h-4" /> RECUSAR
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
