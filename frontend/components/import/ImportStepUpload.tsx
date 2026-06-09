/**
 * Componente reutilizável do frontend; encapsula uma parte relevante da interface dentro do domínio de componentes reutilizáveis da interface.
 */
import React from 'react';
import { X, FileSpreadsheet, Camera, Check, Sparkles, Loader2, ChevronDown, Image } from 'lucide-react';
import { Account, CreditCard, ACCOUNT_TYPE_LABELS } from '../../types';
import { ImportMode, OFX_ACCEPT, RECEIPT_ACCEPT } from './types';

interface ImportStepUploadProps {
    importMode: ImportMode;
    file: File | null;
    accountId: string;
    creditCardId: string;
    isLoading: boolean;
    aiStatus: string;
    accounts: Account[];
    creditCards: CreditCard[];
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    onSwitchMode: (mode: ImportMode) => void;
    onSetAccountId: (id: string) => void;
    onSetCreditCardId: (id: string) => void;
    onProcessFile: () => void;
    onClose: () => void;
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}

export const ImportStepUpload: React.FC<ImportStepUploadProps> = ({
    importMode, file, accountId, creditCardId, isLoading, aiStatus,
    accounts, creditCards, fileInputRef,
    onSwitchMode, onSetAccountId, onSetCreditCardId, onProcessFile,
    onClose, onFileChange, onDragOver, onDrop,
}) => (
    <div className="p-8 space-y-8">
        {/* Mode selector */}
        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-800/50">
            <button
                onClick={() => onSwitchMode('ofx')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${importMode === 'ofx'
                    ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xl shadow-cyan-600/10'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
                <FileSpreadsheet className="w-4 h-4" />
                <span className="hidden sm:inline">Extrato</span> OFX / QFX
            </button>
            <button
                onClick={() => onSwitchMode('receipt')}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${importMode === 'receipt'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xl shadow-blue-600/10'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Foto /</span> Comprovante
            </button>
        </div>

        {/* Account & card selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Conta de Destino</label>
                <div className="relative group">
                    <select required value={accountId} onChange={e => onSetAccountId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none appearance-none cursor-pointer">
                        <option value="" disabled>Selecione a Conta...</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({ACCOUNT_TYPE_LABELS[acc.type] || acc.type})</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </div>
            <div className="space-y-3">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Cartão (Opcional)</label>
                <div className="relative group">
                    <select value={creditCardId} onChange={e => onSetCreditCardId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none appearance-none cursor-pointer">
                        <option value="">Nenhum Cartão</option>
                        {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </div>
        </div>

        {/* Receipt hint */}
        {importMode === 'receipt' && (
            <div className="flex items-start gap-4 p-5 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20">
                <Sparkles className="w-5 h-5 text-blue-500 mt-0.5 shrink-0 animate-pulse" />
                <p className="text-xs text-blue-700 dark:text-blue-300 font-bold leading-relaxed">
                    Envie fotos de comprovantes de PIX, TED, DOC ou recibos de mercado. Nossa IA extrairá os dados e sugerirá a melhor categoria automaticamente.
                </p>
            </div>
        )}

        {/* Upload area */}
        <div
            className={`border-4 border-dashed rounded-[2rem] p-10 text-center transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] ${file
                ? (importMode === 'receipt' ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/5' : 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-500/5')
                : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50'
            }`}
            onClick={() => fileInputRef.current?.click()} onDragOver={onDragOver} onDrop={onDrop}
        >
            <input
                type="file"
                accept={importMode === 'ofx' ? OFX_ACCEPT : RECEIPT_ACCEPT}
                className="hidden"
                ref={fileInputRef}
                onChange={onFileChange}
            />
            {file ? (
                <div className="space-y-3">
                    <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg ${importMode === 'receipt' ? 'bg-blue-600 text-white' : 'bg-cyan-600 text-white'}`}>
                        <Check className="w-8 h-8" />
                    </div>
                    <p className="font-black text-slate-800 dark:text-white text-lg tracking-tight truncate max-w-xs mx-auto">{file.name}</p>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB pronto para análise</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto transition-colors group-hover:bg-cyan-50 dark:group-hover:bg-cyan-500/10">
                        {importMode === 'receipt' ? <Image className="w-8 h-8 text-slate-400 group-hover:text-blue-500 transition-colors" /> : <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-cyan-500 transition-colors" />}
                    </div>
                    <div className="space-y-1">
                        <p className="font-black text-slate-800 dark:text-white text-lg tracking-tight">
                            {importMode === 'ofx' ? 'Arraste seu arquivo OFX' : 'Arraste a foto ou PDF'}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                            {importMode === 'ofx' ? 'Formatos: .ofx, .qfx' : 'Formatos: JPG, PNG, WEBP, PDF • Máx. 10MB'}
                        </p>
                    </div>
                </div>
            )}
        </div>

        <div className="pt-4 space-y-4">
            <div className="flex gap-4">
                <button onClick={onClose} disabled={isLoading} className="flex-[0.4] px-6 py-5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95 disabled:opacity-50">Cancelar</button>
                <button
                    onClick={onProcessFile}
                    disabled={!file || !accountId || isLoading}
                    className={`flex-1 flex gap-3 items-center justify-center px-6 py-5 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl disabled:opacity-50 transition-all active:scale-95 ${importMode === 'receipt'
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                        : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20'
                    }`}
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {isLoading ? 'IA Processando...' : (importMode === 'receipt' ? 'Extrair com IA' : 'Processar & Categorizar')}
                </button>
            </div>

            {aiStatus && (
                <div className="text-center p-4 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100/50 dark:border-cyan-500/20">
                    <p className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-[0.2em] animate-pulse">{aiStatus}</p>
                </div>
            )}
        </div>
    </div>
);