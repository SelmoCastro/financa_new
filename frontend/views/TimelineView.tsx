
import React, { useMemo } from 'react';
import { Transaction } from '../types';

interface TimelineViewProps {
    transactions: Transaction[];
}

export const TimelineView: React.FC<TimelineViewProps> = ({ transactions }) => {
    const transactionsGroupedByDate = useMemo(() => {
        const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const groups: Record<string, Transaction[]> = {};

        sorted.forEach(t => {
            const dateKey = t.date.toString().split('T')[0];
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(t);
        });

        return Object.entries(groups).map(([date, txs]) => ({
            date,
            transactions: txs
        }));
    }, [transactions]);

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center space-y-2">
                <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Caminho Financeiro</h3>
                <p className="text-sm md:text-base text-slate-500 font-medium px-4">Sua jornada detalhada dia após dia</p>
            </div>
            <div className="relative px-2">
                <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-emerald-500 to-slate-200 -translate-x-1/2 rounded-full hidden md:block"></div>
                <div className="space-y-12 md:space-y-16">
                    {transactionsGroupedByDate.map((group, groupIdx) => {
                        const dateObj = new Date(group.date + 'T12:00:00');
                        const isEven = groupIdx % 2 === 0;
                        return (
                            <div key={group.date} className="relative">
                                <div className="sticky top-24 z-10 flex md:justify-center mb-6 md:mb-8">
                                    <div className="bg-slate-900 text-white px-5 py-2 rounded-full font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl ring-4 ring-white">
                                        {dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {group.transactions.map((tx) => (
                                        <div key={tx.id} className={`flex flex-col md:flex-row items-center gap-4 md:gap-8 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                                            <div className="w-full md:w-1/2 pl-12 md:pl-0">
                                                <div className={`bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${isEven ? 'md:mr-auto' : 'md:ml-auto'}`}>
                                                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${tx.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                                    <div className="flex justify-between items-start gap-2">
                                                        <div className="space-y-1 overflow-hidden">
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest truncate">{tx.category}</p>
                                                                {tx.isFixed && <i data-lucide="repeat" className="w-3 h-3 text-indigo-400"></i>}
                                                            </div>
                                                            <h4 className="font-bold text-slate-800 text-base md:text-lg group-hover:text-indigo-600 transition-colors truncate">{tx.description}</h4>
                                                        </div>
                                                        <p className={`font-black text-base md:text-lg whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800'}`}>
                                                            {tx.type === 'INCOME' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="absolute left-8 md:left-1/2 w-3 h-3 md:w-4 md:h-4 rounded-full bg-white border-2 md:border-4 border-indigo-500 -translate-x-1/2 z-0 hidden md:block"></div>
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
