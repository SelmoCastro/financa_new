import React, { useState, useEffect } from 'react';
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

    const fetchInvites = async () => {
        try {
            const res = await api.get('/social/invites');
            setInvites(res.data);
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

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 z-[100] overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-sm text-slate-800">Notificações</h3>
                        <span className="text-[10px] font-black bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full uppercase">
                            {invites.length} Pendentes
                        </span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {invites.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <Bell className="w-6 h-6 text-slate-300" />
                                </div>
                                <p className="text-xs text-slate-400 font-medium">Nenhuma notificação nova por aqui.</p>
                            </div>
                        ) : (
                            invites.map((invite) => (
                                <div key={invite.id} className="p-4 border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={`p-2 rounded-xl ${invite.type === 'EXPENSE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                            {/* SE SENDER É EXPENSE, RECIPIENT É INCOME */}
                                            {invite.type === 'EXPENSE' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-700 leading-tight">
                                                {invite.sender?.name || invite.sender?.email} compartilhou um lançamento
                                            </p>
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                {invite.description} • <span className="font-bold text-slate-700">R$ {invite.amount.toLocaleString('pt-BR')}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {acceptingId === invite.id ? (
                                        <div className="bg-slate-50/80 rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">
                                                    <Wallet className="w-3 h-3" /> Conta de Destino
                                                </div>
                                                <select
                                                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 transition-all cursor-pointer"
                                                    value={selectedAccount}
                                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
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
                                                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400 transition-all cursor-pointer"
                                                    value={selectedCategory}
                                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
                                                    {categories.filter(c => c.type === (invite.type === 'EXPENSE' ? 'INCOME' : 'EXPENSE')).map(cat => (
                                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setAcceptingId(null)}
                                                    className="flex-1 py-2 text-[10px] font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleAccept(invite.id)}
                                                    disabled={loading}
                                                    className="flex-1 py-2 text-[10px] font-bold bg-indigo-500 text-white hover:bg-indigo-600 rounded-lg shadow-sm transition-colors"
                                                >
                                                    Confirmar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setAcceptingId(invite.id)}
                                                className="flex-1 py-1.5 bg-indigo-500 text-white rounded-lg text-[10px] font-black hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <Check className="w-3 h-3" /> ACEITAR
                                            </button>
                                            <button
                                                onClick={() => handleReject(invite.id)}
                                                className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-95"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
