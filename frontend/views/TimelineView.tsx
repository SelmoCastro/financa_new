import React, { useMemo } from 'react';
import { Repeat } from 'lucide-react';
import { Transaction } from '../types';
import { toYYYYMMDD } from '../utils/dateUtils';
import { useCurrency } from '../context/CurrencyContext';

interface TimelineViewProps {
    transactions: Transaction[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ transactions }) => {
    const { formatCurrency, locale } = useCurrency();
    const transactionsGroupedByDate = useMemo(() => {
        if (!Array.isArray(transactions)) return [];
        const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const groups: Record<string, Transaction[]> = {};

        sorted.forEach(t => {
            const dateKey = toYYYYMMDD(t.date);
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(t);
        });

        return Object.entries(groups).map(([date, txs]) => ({
            date,
            transactions: txs
        }));
    }, [transactions]);

    return (
        <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-3">
                <p className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-[0.3em] mb-1">Jornada Temporal</p>
                <h3 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">Caminho Financeiro</h3>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium px-4">Sua história detalhada dia após dia</p>
            </div>
            <div className="relative px-2 md:px-0">
                <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 via-blue-500 to-slate-200 dark:to-slate-800 -translate-x-1/2 rounded-full hidden md:block"></div>
                <div className="space-y-16 md:space-y-24">
                    {transactionsGroupedByDate.map((group, groupIdx) => {
                        const dateObj = new Date(group.date + 'T12:00:00');
                        const isEven = groupIdx % 2 === 0;
                        return (
                            <div key={group.date} className="relative">
                                <div className="sticky top-24 z-10 flex md:justify-center mb-8 md:mb-12">
                                    <div className="bg-slate-900 dark:bg-slate-800 text-white px-8 py-3 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] shadow-2xl ring-4 ring-white dark:ring-slate-950">
                                        {dateObj.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                                <div className="space-y-6 md:space-y-8">
                                    {group.transactions.map((tx) => (
                                        <div key={tx.id} className={`flex flex-col md:flex-row items-center gap-6 md:gap-12 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                            <div className="w-full md:w-1/2 pl-12 md:pl-0">
                                                <div className={`glass-card p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-300 ${isEven ? 'md:mr-auto' : 'md:ml-auto'}`}>
                                                    <div className={`absolute top-0 left-0 bottom-0 w-2 ${tx.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="space-y-2 overflow-hidden">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg truncate">{tx.category?.name || tx.categoryLegacy || 'Outros'}</span>
                                                                {tx.isFixed && <Repeat className="w-4 h-4 text-cyan-400" />}
                                                            </div>
                                                            <h4 className="font-black text-slate-800 dark:text-white text-lg md:text-xl tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">{tx.description}</h4>
                                                        </div>
                                                        <p className={`font-black text-lg md:text-xl tracking-tighter whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800 dark:text-white'}`}>
                                                            {tx.type === 'INCOME' ? '+' : '-'} {formatCurrency(Number(tx.amount))}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute left-8 md:left-1/2 w-4 h-4 md:w-6 md:h-6 rounded-full bg-white dark:bg-slate-900 border-4 md:border-8 border-cyan-500 -translate-x-1/2 z-0 hidden md:block shadow-lg"></div>
                                            <div className="hidden md:block w-1/2"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
