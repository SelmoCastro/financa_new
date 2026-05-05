import React from 'react';
import { AlertTriangle, Inbox, CheckSquare, X, Sparkles, Check, Loader2, ChevronDown } from 'lucide-react';
import { Category } from '../../types';
import { ParsedTransaction, FilterMode } from './types';
import { useCurrency } from '../../context/CurrencyContext';

interface ImportStepReviewProps {
    parsedTxs: ParsedTransaction[];
    filteredTxs: ParsedTransaction[];
    categories: Category[];
    filterMode: FilterMode;
    rejectedCount: number;
    isLoading: boolean;
    receiptPreviewUrl: string | null;
    onSetFilterMode: (f: FilterMode) => void;
    onToggleSelect: (id: string) => void;
    onUpdateCategory: (id: string, newCatId: string) => void;
    onUpdateAmount: (id: string, rawValue: string) => void;
    onSelectAll: () => void;
    onEditDescription: (id: string, value: string) => void;
    onSetStep: (s: 1 | 2) => void;
    onSubmit: () => void;
}

export const ImportStepReview: React.FC<ImportStepReviewProps> = ({
    parsedTxs, filteredTxs, categories, filterMode, rejectedCount,
    isLoading, receiptPreviewUrl,
    onSetFilterMode, onToggleSelect, onUpdateCategory, onUpdateAmount,
    onSelectAll, onEditDescription, onSetStep, onSubmit,
}) => (
    <div className="flex flex-col h-[75vh] max-h-[800px]">
        <div className="px-8 py-5 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-100 dark:border-amber-500/20 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                Revisamos seu extrato e categorizamos o que foi possível. <span className="font-black">Verifique os valores e desmarque o que não deseja importar.</span>
            </p>
        </div>

        {/* Receipt preview */}
        {receiptPreviewUrl && (
            <div className="px-8 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                <img src={receiptPreviewUrl} alt="Preview do comprovante"
                    className="h-16 w-auto rounded-xl border border-slate-200 dark:border-slate-700 object-contain bg-white dark:bg-slate-900 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.open(receiptPreviewUrl, '_blank')}
                />
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Clique para ampliar</span>
            </div>
        )}

        {/* Filter tabs */}
        <div className="px-8 py-6 flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex gap-3">
                {(['all', 'new', 'rejected'] as FilterMode[]).map(f => {
                    const labels = { all: `Tudo (${parsedTxs.length})`, new: 'Novos Lançamentos', rejected: `Rejeitados (${rejectedCount})` };
                    const isActive = filterMode === f;
                    return (
                        <button key={f} onClick={() => onSetFilterMode(f)}
                            className={`text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all active:scale-95 border ${isActive
                                ? (f === 'rejected' ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-cyan-600 text-white border-cyan-600 shadow-lg shadow-cyan-600/20')
                                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-cyan-500'
                            }`}
                        >
                            {labels[f]}
                        </button>
                    );
                })}
            </div>
            {filteredTxs.length > 0 && (
                <button onClick={onSelectAll}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                >
                    {filteredTxs.every(t => t.selected)
                        ? <><X className="w-4 h-4" /> Desmarcar Todos</>
                        : <><CheckSquare className="w-4 h-4" /> Selecionar Todos</>
                    }
                </button>
            )}
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50 p-8">
            {filteredTxs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
                    <Inbox className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm font-black uppercase tracking-widest opacity-60">Nada por aqui</p>
                </div>
            )}
            <div className="grid grid-cols-1 gap-4">
                {filteredTxs.map(tx => (
                    <TransactionRow
                        key={tx.id}
                        tx={tx}
                        categories={categories}
                        onToggleSelect={onToggleSelect}
                        onUpdateCategory={onUpdateCategory}
                        onUpdateAmount={onUpdateAmount}
                        onEditDescription={onEditDescription}
                    />
                ))}
            </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900">
            <button onClick={() => onSetStep(1)} className="w-full sm:w-auto px-8 py-4 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95">
                Alterar Arquivo
            </button>
            <button onClick={onSubmit} disabled={isLoading || parsedTxs.filter(t => t.selected).length === 0}
                className="w-full sm:w-auto px-10 py-5 text-white font-black uppercase tracking-widest text-xs bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {isLoading ? 'Finalizando...' : `Importar ${parsedTxs.filter(t => t.selected).length} Transações`}
            </button>
        </div>
    </div>
);

// ─── Transaction Row Sub-component ──────────────────────────

interface TransactionRowProps {
    tx: ParsedTransaction;
    categories: Category[];
    onToggleSelect: (id: string) => void;
    onUpdateCategory: (id: string, catId: string) => void;
    onUpdateAmount: (id: string, raw: string) => void;
    onEditDescription: (id: string, value: string) => void;
}

const TransactionRow: React.FC<TransactionRowProps> = ({
    tx, categories, onToggleSelect, onUpdateCategory, onUpdateAmount, onEditDescription,
}) => (
    <div className={`flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[2rem] border transition-all duration-300 ${tx.isPreviouslyRejected
        ? 'border-red-200 dark:border-red-500/30 bg-red-50/20 dark:bg-red-500/5'
        : tx.isPotentialDuplicate
            ? 'border-orange-200 dark:border-orange-500/30 bg-orange-50/40 dark:bg-orange-500/5'
            : tx.selected ? 'bg-white dark:bg-slate-900 border-cyan-200 dark:border-cyan-500/30 shadow-xl shadow-cyan-500/5' : 'bg-slate-100/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-60'
    }`}>
        <div className="flex items-center gap-6 w-full sm:w-auto">
            <div className="relative">
                <input type="checkbox" id={`tx-${tx.id}`} checked={tx.selected}
                    onChange={() => onToggleSelect(tx.id)}
                    className="w-6 h-6 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-4 focus:ring-cyan-500/20 transition-all cursor-pointer"
                />
            </div>
            <div className="w-36 shrink-0">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{tx.date.split('-').reverse().join('/')}</p>
                <div className="relative group/amount">
                    <input type="text" value={tx.amount.toFixed(2)}
                        onChange={e => onUpdateAmount(tx.id, e.target.value)}
                        className={`w-full bg-transparent text-xl font-black tracking-tighter focus:outline-none border-b-2 border-transparent focus:border-cyan-500 transition-all ${
                            tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800 dark:text-white'
                        }`}
                    />
                </div>
                {tx.isPreviouslyRejected && <span className="text-[8px] font-black text-red-500 uppercase tracking-[0.2em] mt-2 block">⛔ Já Importado</span>}
                {!tx.isPreviouslyRejected && tx.isPotentialDuplicate && <span className="text-[8px] font-black text-orange-500 uppercase tracking-[0.2em] mt-2 block">⚠️ Duplicata?</span>}
            </div>
        </div>

        <div className="flex-1 w-full space-y-3">
            <div className="relative group">
                <input type="text" value={tx.description}
                    onChange={e => onEditDescription(tx.id, e.target.value)}
                    className="w-full bg-transparent text-lg font-black text-slate-800 dark:text-white focus:outline-none border-b-2 border-transparent focus:border-cyan-500 transition-all tracking-tight"
                />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                {tx.suggestedCategory && (
                    <span className="text-[9px] px-3 py-1 rounded-lg border-2 border-cyan-100 dark:border-cyan-500/20 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 flex items-center gap-2 font-black uppercase tracking-widest">
                        <span>{tx.suggestedIcon}</span>{tx.suggestedCategory}
                    </span>
                )}
                {tx.cnpj && (
                    <span className="text-[8px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                        CNPJ: {tx.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                    </span>
                )}
                {tx.confidence !== undefined && (
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border font-black uppercase tracking-widest text-[8px] ${
                        tx.confidence >= 80 ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-100 dark:border-emerald-500/20' :
                        tx.confidence >= 50 ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 border-amber-100 dark:border-amber-500/20' :
                        'bg-rose-50 dark:bg-rose-500/10 text-rose-600 border-rose-100 dark:border-rose-500/20'
                    }`}>
                        <Sparkles className="w-3 h-3" /> IA: {tx.confidence}%
                    </div>
                )}
            </div>
        </div>

        <div className="w-full sm:w-64 shrink-0">
            <div className="relative group">
                <select value={tx.categoryId || ''}
                    onChange={(e) => onUpdateCategory(tx.id, e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-cyan-500/10 outline-none transition-all appearance-none cursor-pointer"
                >
                    <option value="" disabled>Selecione a categoria...</option>
                    <optgroup label="Entradas (Rendas)">
                        {categories.filter(c => c.type === 'INCOME').map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                    </optgroup>
                    {tx.type === 'EXPENSE' && (
                        <>
                            <optgroup label="Necessidades (Essencial)">
                                {categories.filter(c =>
                                    ['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Combustível / Gasolina', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais'].includes(c.name)
                                ).map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
                            </optgroup>
                            <optgroup label="Desejos (Estilo de Vida)">
                                {categories.filter(c =>
                                    ['Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Cuidados com Pets', 'Viagens'].includes(c.name)
                                ).map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
                            </optgroup>
                            <optgroup label="Objetivos (Quitação e Reserva)">
                                {categories.filter(c =>
                                    ['Aplicações / Poupança', 'Pagamento de Dívidas'].includes(c.name)
                                ).map(c => (<option key={c.id} value={c.id}>{c.icon} {c.name}</option>))}
                            </optgroup>
                        </>
                    )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-3 h-3" />
                </div>
            </div>
        </div>
    </div>
);