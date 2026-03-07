import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, X, ArrowUpRight, ArrowDownLeft, Wallet, Tag } from 'lucide-react';
import api from '../services/api';
import { useData } from '../context/DataProvider';
import { useToast } from '../context/ToastContext';

export const NotificationCenter: React.FC = () => {
    const [invites, setInvites] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { refreshData, accounts, categories } = useData();
    const { addToast } = useToast();

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
                className="relative p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
            >
                <Bell className="w-5 h-5" />
                {invites.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse" />
                )}
            </button>

            {isOpen && createPortal(
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
                        <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-20">
                            <X className="w-5 h-5" />
                        </button>
                        
                        <div className="p-6 border-b border-slate-100 bg-indigo-50/50 text-center relative shrink-0">
                           <div className="w-16 h-16 bg-white shadow-sm text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10">
                               <Bell className="w-8 h-8 animate-bounce" />
                           </div>
                           <h2 className="text-xl font-black text-slate-800 relative z-10">Notificações</h2>
                           <p className="text-sm text-slate-500 font-medium relative z-10 mt-1">Você tem {invites.length} {invites.length === 1 ? 'pendência' : 'pendências'}</p>
                        </div>

                        <div className="overflow-y-auto p-4 space-y-4">
                            {invites.length === 0 ? (
                                <div className="py-8 text-center text-slate-400">
                                    <p className="text-sm font-medium">Nenhuma notificação nova por aqui.</p>
                                </div>
                            ) : (
                                invites.map((invite) => (
                                    <div key={invite.id} className="p-4 border border-slate-100 rounded-2xl bg-white shadow-sm hover:border-indigo-100 transition-colors">
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className={`p-2.5 rounded-xl ${invite.type === 'EXPENSE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {/* SE SENDER É EXPENSE, RECIPIENT É INCOME */}
                                                {invite.type === 'EXPENSE' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-800 leading-tight">
                                                    {invite.sender?.name || invite.sender?.email} enviou um lançamento
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {invite.description}
                                                </p>
                                                <p className="font-black text-slate-800 mt-1 text-base">
                                                    R$ {invite.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        {acceptingId === invite.id ? (
                                            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100 animate-in fade-in slide-in-from-top-2">
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                                        <Wallet className="w-3 h-3" /> Conta de Destino
                                                    </div>
                                                    <select
                                                        className="w-full text-sm p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                                                        value={selectedAccount}
                                                        onChange={(e) => setSelectedAccount(e.target.value)}
                                                    >
                                                        <option value="">Selecione a conta...</option>
                                                        {accounts.map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                                        <Tag className="w-3 h-3" /> Categoria
                                                    </div>
                                                    <select
                                                        className="w-full text-sm p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                                                        value={selectedCategory}
                                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                                    >
                                                        <option value="">Selecione a categoria...</option>
                                                        {categories.filter(c => c.type === invite.type).map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="flex gap-2 pt-2">
                                                    <button
                                                        onClick={() => setAcceptingId(null)}
                                                        className="flex-1 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"
                                                    >
                                                        Voltar
                                                    </button>
                                                    <button
                                                        onClick={() => handleAccept(invite.id)}
                                                        disabled={loading}
                                                        className="flex-[2] py-2.5 text-xs font-black bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        <Check className="w-4 h-4" /> Confirmar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setAcceptingId(invite.id)}
                                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md"
                                                >
                                                    <Check className="w-4 h-4" /> ACEITAR
                                                </button>
                                                <button
                                                    onClick={() => handleReject(invite.id)}
                                                    className="px-4 py-2.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-black hover:bg-rose-100 hover:text-rose-600 transition-all active:scale-95 flex items-center justify-center"
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
