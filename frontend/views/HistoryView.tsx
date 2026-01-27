
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';

interface HistoryViewProps {
    transactions: Transaction[];
    isPrivacyEnabled: boolean;
    onEdit: (tx: Transaction) => void;
    onDelete: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ transactions, isPrivacyEnabled, onEdit, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');

    const filteredHistory = useMemo(() => {
        return transactions.filter(tx => {
            const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tx.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = filterType === 'ALL' || tx.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [transactions, searchTerm, filterType]);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
            <div className="flex justify-between items-center px-4">
                <h3 className="text-xl font-black text-slate-800">Gerenciar Lançamentos</h3>
                <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{transactions.length} registros</p>
            </div>

            {/* Mobile/Card View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 lg:hidden">
                {filteredHistory.map((tx) => (
                    <div key={tx.id} className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${tx.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg ${tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    <i data-lucide={tx.type === 'INCOME' ? 'arrow-up-right' : 'arrow-down-left'} className="w-5 h-5"></i>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-slate-800 text-base group-hover:text-indigo-600 transition-colors truncate">{tx.description}</p>
                                        {tx.isFixed && <i data-lucide="repeat" className="w-3.5 h-3.5 text-indigo-400"></i>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[8px] uppercase font-black tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg truncate">{tx.category}</span>
                                        <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <p className={`font-black text-base ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800'} ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                    {isPrivacyEnabled ? 'R$ •••••••' : `${tx.type === 'INCOME' ? '+' : '-'} R$ ${Number(tx.amount).toLocaleString('pt-BR')}`}
                                </p>
                                <div className="flex gap-1">
                                    <button onClick={() => onEdit(tx)} className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"><i data-lucide="edit-3" className="w-4 h-4"></i></button>
                                    <button onClick={() => onDelete(tx.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop/Table View */}
            <div className="hidden lg:block bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100 space-y-6">
                    <div className="flex justify-between items-center gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Extrato Consolidado</h3>
                            <p className="text-sm text-slate-500 font-medium">Análise granular e filtros</p>
                        </div>
                        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                            {['ALL', 'INCOME', 'EXPENSE'].map((type) => (
                                <button key={type} onClick={() => setFilterType(type as any)} className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                                    {type === 'ALL' ? 'Todos' : type === 'INCOME' ? 'Ganhos' : 'Gastos'}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="relative w-full">
                        <i data-lucide="search" className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                        <input type="text" placeholder="Filtrar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-[0.15em]">
                            <tr><th className="px-8 py-5 text-left">Item</th><th className="px-8 py-5 text-left">Categoria</th><th className="px-8 py-5 text-left">Data</th><th className="px-8 py-5 text-right">Valor</th><th className="px-8 py-5 text-right">Ações</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredHistory.map((tx) => (
                                <tr key={tx.id} className="hover:bg-indigo-50/20 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                            <span className="font-bold text-slate-700 truncate block">{tx.description}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6"><span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-tighter">{tx.category}</span></td>
                                    <td className="px-8 py-6 text-sm font-bold text-slate-400">{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                    <td className={`px-8 py-6 text-right font-black ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800'} ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                        {isPrivacyEnabled ? 'R$ •••••••' : `${tx.type === 'INCOME' ? '+' : '-'} R$ ${Number(tx.amount).toLocaleString('pt-BR')}`}
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEdit(tx)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><i data-lucide="edit-3" className="w-4 h-4"></i></button>
                                            <button onClick={() => onDelete(tx.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
