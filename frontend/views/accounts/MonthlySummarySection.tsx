/**
 * Seção visual especializada de uma tela maior; isola uma parte importante da interface para manter o fluxo mais legível.
 */
import React from 'react';
import { ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { MonthlySummaryGroup } from './types';
import { useCurrency } from '../../context/CurrencyContext';
import { formatMonth } from './utils';

interface MonthlySummarySectionProps {
  isPrivacyEnabled: boolean;
  monthlySummary: MonthlySummaryGroup[];
  expandedInstallId: string | null;
  onToggleExpand: (id: string | null) => void;
}

export const MonthlySummarySection: React.FC<MonthlySummarySectionProps> = ({
  isPrivacyEnabled, monthlySummary, expandedInstallId, onToggleExpand,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <section className="pt-12 border-t border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Planejamento</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            Resumo Mensal
          </h3>
        </div>
      </div>

      {monthlySummary.length === 0 ? (
        <div className="glass-card border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-16 text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 mx-auto rounded-[2rem] flex items-center justify-center shadow-sm mb-8 border border-slate-100 dark:border-slate-800">
            <ShoppingBag className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Nenhuma parcela pendente</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">Todas as suas parcelas estão em dia ou não há compras parceladas agendadas para o futuro.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {monthlySummary.map(month => {
            const monthName = formatMonth(month.month);
            const isCurrentMonth = month.month === new Date().getMonth() + 1 && month.year === new Date().getFullYear();
            const monthExpandId = `month-${month.key}`;

            return (
              <div key={month.key} className="glass-card rounded-[2rem] p-6 hover:translate-y-[-2px] transition-all duration-300 group border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isCurrentMonth ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white/40'}`}>
                      <span className="text-[10px] font-black uppercase tracking-widest">{monthName}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-800 dark:text-white">
                      {monthName} {month.year}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${isCurrentMonth ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-white/50'}`}>
                    {isCurrentMonth ? 'Mês Atual' : 'Futuro'}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Total do Mês</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {isPrivacyEnabled ? '•••••' : formatCurrency(month.total)}
                  </p>
                </div>

                {/* Expandable items list */}
                <div className="mt-4">
                  <button
                    onClick={() => onToggleExpand(expandedInstallId === monthExpandId ? null : monthExpandId)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left bg-slate-50 dark:bg-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/20 transition-all"
                  >
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-slate-700 dark:text-white truncate">
                        Ver {month.items.length} parcela{month.items.length !== 1 ? 's' : ''} deste mês
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {expandedInstallId === monthExpandId ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-white/30" />
                      )}
                    </div>
                  </button>

                  {expandedInstallId === monthExpandId && (
                    <div className="mt-3 space-y-2">
                      {month.items.map(item => (
                        <div key={`${month.key}-${item.installmentNumber}`} className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-xl">
                          <div className="flex-1">
                            <p className="text-[11px] font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                              {item.description}
                            </p>
                            <p className="text-[9px] text-slate-500 dark:text-white/50 truncate">
                              {item.cardName} - {item.installmentNumber}x
                            </p>
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {isPrivacyEnabled ? '•••••' : formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};