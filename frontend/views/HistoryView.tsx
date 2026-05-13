
import React, { useState, useMemo } from 'react';
import { Edit3, Trash2, ArrowUpRight, ArrowDownLeft, Repeat, Search, Inbox } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface HistoryViewProps {
    transactions: Transaction[];
    isPrivacyEnabled: boolean;
    onEdit: (tx: Transaction) => void;
    onDelete: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ transactions, isPrivacyEnabled, onEdit, onDelete }) => {
    const { formatCurrency, locale } = useCurrency();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');

    const filteredHistory = useMemo(() => {
        if (!Array.isArray(transactions)) return [];
        return transactions.filter(tx => {
            const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (tx.category?.name || tx.categoryLegacy || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'ALL' || tx.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [transactions, searchTerm, filterType]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 px-2">
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Movimentações</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Extrato Detalhado</h3>
                </div>
                <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{filteredHistory.length} registros</span>
                </div>
            </div>

            {/* Mobile/Card View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 lg:hidden">
                {filteredHistory.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 px-6">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                            <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                        </div>
                        <p className="text-slate-400 dark:text-slate-500 font-bold text-lg mb-1">Nenhuma movimentação</p>
                        <p className="text-slate-300 dark:text-slate-600 text-sm text-center">As transações aparecerão aqui conforme você adicioná-las.</p>
                    </div>
                ) : (
                filteredHistory.map((tx) => (
                    <div key={tx.id} className="glass-card p-6 rounded-[2rem] relative overflow-hidden group hover:translate-y-[-2px] transition-all duration-300">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${tx.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-12 h-12 rounded-2xl flex-shrink-0 flex items-center justify-center text-xl shadow-sm ${tx.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                    {tx.type === 'INCOME' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-black text-slate-800 dark:text-white text-base group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate tracking-tight">{tx.description}</p>
                                        {tx.isFixed && <Repeat className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] uppercase font-black tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg truncate">{tx.category?.name || tx.categoryLegacy || 'Outros'}</span>
                                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold whitespace-nowrap">{new Date(tx.date).toLocaleDateString(locale, { timeZone: 'UTC' })}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3 flex-shrink-0">
                                <p className={`font-black text-lg tracking-tighter ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800 dark:text-white'} ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                    {isPrivacyEnabled ? '•••••••' : `${tx.type === 'INCOME' ? '+' : '-'} ${formatCurrency(Number(tx.amount))}`}
                                </p>
                                <div className="flex gap-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <button onClick={() => onEdit(tx)} className="p-2 text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all shadow-sm"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => onDelete(tx.id)} className="p-2 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
                )}
            </div>

            {/* Desktop/Table View */}
            <div className="hidden lg:block glass-card rounded-[2.5rem] overflow-hidden">
                <div className="p-10 border-b border-slate-100 dark:border-slate-800 space-y-8">
                    <div className="flex justify-between items-center gap-4">
                        <div className="space-y-1">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Extrato Consolidado</h3>
                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Filtros Inteligentes</p>
                        </div>
                        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-800/50">
                            {['ALL', 'INCOME', 'EXPENSE'].map((type) => (
                                <button key={type} onClick={() => setFilterType(type as any)} className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 ${filterType === type ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xl shadow-cyan-600/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
                                    {type === 'ALL' ? 'Todos' : type === 'INCOME' ? 'Ganhos' : 'Gastos'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative group">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 group-focus-within:text-cyan-500 transition-colors">
                            <Search className="w-5 h-5" />
                        </div>
                        <input type="text" placeholder="Pesquise por descrição ou categoria..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] text-sm outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {filteredHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6">
                            <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-6">
                                <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                            </div>
                            <p className="text-slate-400 dark:text-slate-500 font-bold text-lg mb-1">Nenhuma movimentação</p>
                            <p className="text-slate-300 dark:text-slate-600 text-sm text-center">As transações aparecerão aqui conforme você adicioná-las.</p>
                        </div>
                    ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 text-[10px] uppercase font-black tracking-[0.2em] border-b border-slate-100 dark:border-slate-800">
                                <th className="px-10 py-6 text-left">Item</th>
                                <th className="px-10 py-6 text-left">Categoria</th>
                                <th className="px-10 py-6 text-left">Data</th>
                                <th className="px-10 py-6 text-right">Valor</th>
                                <th className="px-10 py-6 text-right">Gerenciar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredHistory.map((tx) => (
                                <tr key={tx.id} className="hover:bg-cyan-50/30 dark:hover:bg-cyan-500/5 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ${tx.type === 'INCOME' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                            <div className="min-w-0">
                                                <span className="font-black text-slate-800 dark:text-white text-base tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors block truncate">{tx.description}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                            {tx.category?.name || tx.categoryLegacy || 'Outros'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{new Date(tx.date).toLocaleDateString(locale, { timeZone: 'UTC' })}</td>
                                    <td className={`px-10 py-6 text-right font-black text-lg tracking-tighter ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800 dark:text-white'} ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                        {isPrivacyEnabled ? '•••••••' : `${tx.type === 'INCOME' ? '+' : '-'} ${formatCurrency(Number(tx.amount))}`}
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            <button onClick={() => onEdit(tx)} className="p-3 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700"><Edit3 className="w-4 h-4" /></button>
                                            <button onClick={() => onDelete(tx.id)} className="p-3 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-100 dark:hover:border-slate-700"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    )}
                </div>
            </div>
        </div>
    );
};
