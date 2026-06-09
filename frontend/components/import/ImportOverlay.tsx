/**
 * Componente reutilizável do frontend; encapsula uma parte relevante da interface dentro do domínio de componentes reutilizáveis da interface.
 */
import React from 'react';
import { X, CheckSquare, UploadCloud } from 'lucide-react';
import { ImportOverlayProps } from './types';
import { useImportLogic } from './useImportLogic';
import { ImportStepUpload } from './ImportStepUpload';
import { ImportStepReview } from './ImportStepReview';

export const ImportOverlay: React.FC<ImportOverlayProps> = ({ onImportSuccess, onClose, accounts, creditCards, categories: propCategories }) => {
    const logic = useImportLogic(propCategories, onImportSuccess, onClose);

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all duration-300">
            <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full ${logic.step === 2 ? 'max-w-5xl' : 'max-w-lg'} overflow-hidden animate-in zoom-in-95 duration-300 transition-all border border-slate-200 dark:border-slate-800`}>
                {/* Header */}
                <div className="px-8 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Processamento</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${logic.step === 2 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'}`}>
                                {logic.step === 2 ? <CheckSquare className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                            </div>
                            {logic.step === 1 ? 'Importar Extrato' : 'Revisar & Confirmar'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all active:scale-95">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {logic.step === 1 && (
                    <ImportStepUpload
                        importMode={logic.importMode}
                        file={logic.file}
                        accountId={logic.accountId}
                        creditCardId={logic.creditCardId}
                        isLoading={logic.isLoading}
                        aiStatus={logic.aiStatus}
                        accounts={accounts}
                        creditCards={creditCards}
                        fileInputRef={logic.fileInputRef}
                        onSwitchMode={logic.switchMode}
                        onSetAccountId={logic.setAccountId}
                        onSetCreditCardId={logic.setCreditCardId}
                        onProcessFile={logic.processFile}
                        onClose={onClose}
                        onFileChange={logic.handleFileChange}
                        onDragOver={logic.handleDragOver}
                        onDrop={logic.handleDrop}
                    />
                )}

                {logic.step === 2 && (
                    <ImportStepReview
                        parsedTxs={logic.parsedTxs}
                        filteredTxs={logic.filteredTxs}
                        categories={logic.categories}
                        filterMode={logic.filterMode}
                        rejectedCount={logic.rejectedCount}
                        isLoading={logic.isLoading}
                        receiptPreviewUrl={logic.receiptPreviewUrl}
                        onSetFilterMode={logic.setFilterMode}
                        onToggleSelect={logic.toggleSelect}
                        onUpdateCategory={logic.updateCategory}
                        onUpdateAmount={logic.updateAmount}
                        onSelectAll={logic.handleSelectAll}
                        onEditDescription={(id, value) => logic.setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, description: value } : t))}
                        onSetStep={logic.setStep}
                        onSubmit={logic.handleSubmit}
                    />
                )}
            </div>
        </div>
    );
};