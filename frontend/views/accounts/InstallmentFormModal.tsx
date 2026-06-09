/**
 * Arquivo de suporte do frontend ligado a telas e fluxos principais; mantém comportamento ou tipagem reutilizável.
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { InstallFormData, InstallmentPreview } from './types';

interface InstallmentFormModalProps {
  installForm: InstallFormData;
  installmentPreview: InstallmentPreview | null;
  setInstallForm: (f: InstallFormData) => void;
  onSubmit: () => void;
  onClose: () => void;
  creditCardLimit?: number;
  creditCardUsed?: number;
  useCustomValues?: boolean;
  setUseCustomValues?: (v: boolean) => void;
  installmentAmounts?: string[];
  setInstallmentAmounts?: (v: string[]) => void;
}

export const InstallmentFormModal: React.FC<InstallmentFormModalProps> = ({
  installForm, installmentPreview, setInstallForm, onSubmit, onClose,
  creditCardLimit = 0, creditCardUsed = 0,
  useCustomValues = false, setUseCustomValues, installmentAmounts = [], setInstallmentAmounts,
}) => {
  const { formatCurrency, locale } = useCurrency();
  const availableLimit = creditCardLimit - creditCardUsed;

  // Currency input formatting
  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const amount = parseInt(digits) / 100;
    return amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseCurrencyToNumber = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const currentTotal = parseCurrencyToNumber(installForm.totalAmount);
  const exceedsLimit = creditCardLimit > 0 && (creditCardUsed + currentTotal) > creditCardLimit;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-cyan-50/50 dark:bg-slate-950/50 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Nova Compra Parcelada</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Descrição</label>
          <input className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500" placeholder="Descrição (ex: Notebook, Geladeira)" value={installForm.description} onChange={e => setInstallForm({...installForm, description: e.target.value})} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Valor total (R$)</label>
              <input
                type="text"
                inputMode="numeric"
                className={`w-full p-3.5 bg-white dark:bg-slate-950 border rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-500/10 text-slate-900 dark:text-white ${exceedsLimit ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200 dark:border-slate-800 focus:border-cyan-500'}`}
                placeholder="0,00"
                value={installForm.totalAmount}
                onChange={e => setInstallForm({...installForm, totalAmount: formatCurrencyInput(e.target.value)})}
              />
              {creditCardLimit > 0 && (
                <p className={`text-[10px] font-bold mt-1 ${exceedsLimit ? 'text-rose-500' : 'text-slate-400'}`}>
                  {exceedsLimit ? 'Excede o limite!' : `Disponível: ${formatCurrency(availableLimit - currentTotal)} / ${formatCurrency(creditCardLimit)}`}
                </p>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Número de parcelas</label>
              <input type="number" min="1" className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-slate-900 dark:text-white" placeholder="N° parcelas" value={installForm.installmentCount} onChange={e => setInstallForm({...installForm, installmentCount: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Valor da entrada (opcional)</label>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 mb-2">Primeira parcela (deixe 0 se não houver entrada)</p>
            <input
              type="text"
              inputMode="numeric"
              className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-slate-900 dark:text-white"
              placeholder="0,00"
              value={installForm.entryAmount}
              onChange={e => setInstallForm({...installForm, entryAmount: formatCurrencyInput(e.target.value)})}
            />
          </div>

          {/* Custom installment values */}
          {Number(installForm.installmentCount) > 1 && setUseCustomValues && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Valor por parcela</label>
                <button
                  type="button"
                  onClick={() => {
                    const newVal = !useCustomValues;
                    setUseCustomValues(newVal);
                    if (newVal) {
                      const count = Number(installForm.installmentCount) || 1;
                      const totalNum = parseCurrencyToNumber(installForm.totalAmount);
                      const equalShare = count > 0 ? totalNum / count : 0;
                      setInstallmentAmounts?.(Array.from({ length: count }, () => equalShare.toFixed(2).replace('.', ',')));
                    } else {
                      setInstallmentAmounts?.([]);
                    }
                  }}
                  className="flex items-center gap-1.5 text-[11px] font-bold"
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center ${useCustomValues ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300 bg-white'}`}>
                    {useCustomValues && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </span>
                  <span className={useCustomValues ? 'text-cyan-600' : 'text-slate-400'}>Personalizar</span>
                </button>
              </div>
              {useCustomValues && (() => {
                const count = Number(installForm.installmentCount) || 1;
                const totalNum = parseCurrencyToNumber(installForm.totalAmount);
                const sumValues = installmentAmounts.reduce((acc, v) => acc + (Number(v?.replace(',', '.')) || 0), 0);
                const diff = Math.abs(sumValues - totalNum);
                return (
                  <div className="space-y-2">
                    {Array.from({ length: count }, (_, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500 w-16">{i + 1}ª parcela</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className="flex-1 p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 text-slate-900 dark:text-white"
                          placeholder="0,00"
                          value={installmentAmounts[i] || ''}
                          onChange={e => {
                            const newAmounts = [...installmentAmounts];
                            newAmounts[i] = formatCurrencyInput(e.target.value);
                            setInstallmentAmounts?.(newAmounts);
                          }}
                        />
                      </div>
                    ))}
                    <div className="flex justify-between text-[10px] font-bold pt-1">
                      <span className={diff > 0.02 ? 'text-rose-500' : 'text-emerald-500'}>Soma: {formatCurrency(sumValues)}</span>
                      <span className={diff > 0.02 ? 'text-rose-500' : 'text-emerald-500'}>
                        {diff > 0.02 ? `Falta ${formatCurrency(totalNum - sumValues)}` : '✓ Valores conferem'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">Dia do vencimento</label>
            <p className="p-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300">Dia {installForm.dueDay} (do cartão)</p>
          </div>

          {/* Live preview */}
          {installmentPreview && (
            <div className="bg-cyan-50 dark:bg-cyan-500/10 rounded-xl p-3 space-y-1.5 border border-cyan-100 dark:border-cyan-500/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 mb-1">Prévia das parcelas</p>
              {installmentPreview.entry > 0 && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">Entrada</span>
                  <span className="font-black text-amber-700 dark:text-amber-300">{formatCurrency(installmentPreview.entry)}</span>
                </div>
              )}
              {installmentPreview.count > (installmentPreview.entry > 0 ? 1 : 0) && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300 font-bold">
                    {installmentPreview.entry > 0 ? `${installmentPreview.count - 1}x de` : `${installmentPreview.count}x de`}
                  </span>
                  <span className="font-black text-cyan-700 dark:text-cyan-300">{formatCurrency(installmentPreview.perMonth)}</span>
                </div>
              )}
              <div className="flex justify-between text-[11px] pt-1.5 border-t border-cyan-200 dark:border-cyan-500/20">
                <span className="font-bold text-slate-600 dark:text-slate-300">Total</span>
                <span className="font-black text-slate-800 dark:text-white">{formatCurrency(installmentPreview.total)}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-xl">Cancelar</button>
            <button onClick={onSubmit} className={`flex-[2] py-3 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg ${(exceedsLimit) ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-cyan-600 text-white hover:bg-cyan-700 shadow-cyan-600/20'}`}>Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  );
};