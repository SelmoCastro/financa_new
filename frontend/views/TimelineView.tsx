/**
 * Tela principal do frontend para Timeline; reúne estado visual, ações do usuário e composição de componentes.
 */
import React, { useMemo } from 'react';
import { Repeat } from 'lucide-react';
import { Transaction } from '../types';
import { toYYYYMMDD } from '../utils/dateUtils';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface TimelineViewProps {
    transactions: Transaction[];
    isPrivacyEnabled: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ transactions, isPrivacyEnabled }) => {
    const { formatCurrency, locale } = useCurrency();
    const { t } = useLanguage();
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
        <div className="max-w-4xl mx-auto space-y-10 sm:space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-3 sm:space-y-4 px-4">
                <p className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-widest">{t('timeline.subtitle')}</p>
                <h3 className="text-xl sm:text-2xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">{t('timeline.title')}</h3>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{t('timeline.desc')}</p>
            </div>
            <div className="relative px-2 md:px-0">
                <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 via-blue-500 to-slate-200 dark:to-slate-800 -translate-x-1/2 rounded-full hidden md:block"></div>
                <div className="space-y-16 md:space-y-24">
                    {transactionsGroupedByDate.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-slate-400 dark:text-slate-500 font-bold">{t('timeline.noData')}</p>
                        </div>
                    ) : (
                        transactionsGroupedByDate.map((group, groupIdx) => {
                            const dateObj = new Date(group.date + 'T12:00:00');
                            const isEven = groupIdx % 2 === 0;
                            return (
                                <div key={group.date} className="relative">
                                    <div className="sticky top-24 z-10 flex md:justify-center mb-6 md:mb-12">
                                        <div className="bg-slate-900 dark:bg-slate-800 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-[0.3em] shadow-2xl ring-4 ring-white dark:ring-slate-950">
                                            {dateObj.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 ${isEven ? 'md:flex-row' : ''}`}>
                                        {group.transactions.map((tx, txIdx) => (
                                            <div key={tx.id} className={`relative md:col-span-6 ${isEven ? 'md:col-start-7' : ''}`}>
                                                <div className="p-4 sm:p-6 rounded-2xl md:rounded-3xl bg-white dark:bg-slate-900 border border-slate-100/70 dark:border-slate-800/70 shadow-sm hover:shadow-xl transition-all duration-300 hover:translate-y-[-2px] group">
                                                    <div className="flex items-center gap-4 mb-2">
                                                        <div className={`text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-xl ${tx.type === 'INCOME' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                                                            {tx.type === 'INCOME' ? t('common.income') : t('common.expense')}
                                                        </div>
                                                        {tx.isFixed && <Repeat className="w-3.5 h-3.5 text-cyan-500 animate-pulse" />}
                                                    </div>
                                                    <p className="font-black text-sm sm:text-base text-slate-800 dark:text-white tracking-tight mb-1">{tx.description}</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{tx.category?.name || tx.categoryLegacy}</span>
                                                        <span className={`text-sm sm:text-base font-black tracking-tight ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800 dark:text-white'} ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                                            {isPrivacyEnabled ? '•••••••' : `${tx.type === 'INCOME' ? '+' : '-'} ${formatCurrency(Number(tx.amount))}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
