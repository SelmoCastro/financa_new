import { X, FileSpreadsheet, Camera, Info, Loader2, Sparkles, AlertTriangle, Inbox, Check, ChevronLeft, ChevronRight, ChevronDown, EyeOff, Eye, CheckSquare, UploadCloud, Image } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Account, CreditCard, Category, ACCOUNT_TYPE_LABELS } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface ImportOverlayProps {
    onImportSuccess: () => void;
    onClose: () => void;
    accounts: Account[];
    creditCards: CreditCard[];
    categories: Category[];
    existingTransactions?: any[];
}

import { parseOFX } from '../utils/ofxParser';
import { toYYYYMMDD } from '../utils/dateUtils';

interface ParsedTransaction {
    id: string;
    fitId?: string;
    date: string;
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    categoryLegacy: string;
    categoryId?: string;
    classificationRule?: number;
    suggestedCategory?: string;
    suggestedCategoryId?: string;
    suggestedIcon?: string;
    selected: boolean;
    isPotentialDuplicate?: boolean;
    isPreviouslyRejected?: boolean;
    confidence?: number;
    cnpj?: string;
}

type ImportMode = 'ofx' | 'receipt';
type FilterMode = 'all' | 'new' | 'rejected';

const ERROR_MESSAGES: Record<string, string> = {
    no_data_found: 'Não foi possível identificar transações neste documento. Verifique se é um comprovante financeiro válido e tente com uma imagem mais nítida.',
    unsupported_format: 'Formato não suportado pelo modelo de IA. Use JPG, PNG, WEBP ou PDF.',
    rate_limit: 'Muitas solicitações em sequência. Aguarde um momento e tente novamente.',
    api_error: 'Erro temporário no serviço de IA. Tente novamente em alguns instantes.',
    service_unavailable: 'Serviço de IA indisponível no momento. Tente novamente mais tarde.',
    unknown_error: 'Erro inesperado ao processar o documento. Tente novamente.',
};

export const ImportOverlay: React.FC<ImportOverlayProps> = ({ onImportSuccess, onClose, accounts, creditCards, categories: propCategories }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [file, setFile] = useState<File | null>(null);
    const [parsedTxs, setParsedTxs] = useState<ParsedTransaction[]>([]);
    const [accountId, setAccountId] = useState('');
    const [creditCardId, setCreditCardId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState('');
    const [importMode, setImportMode] = useState<ImportMode>('ofx');
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { formatCurrency } = useCurrency();

    // Always fetch fresh categories when opening the import overlay
    const [categories, setCategories] = useState<Category[]>(propCategories || []);
    useEffect(() => {
        api.get<Category[]>('/categories')
            .then(res => setCategories(res.data))
            .catch(() => setCategories(propCategories || []));
    }, []);

    const OFX_ACCEPT = '.ofx,.qfx';
    const RECEIPT_ACCEPT = '.jpg,.jpeg,.png,.webp,.pdf';

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            if (receiptPreviewUrl) {
                URL.revokeObjectURL(receiptPreviewUrl);
                setReceiptPreviewUrl(null);
            }
        }
    };

    const switchMode = (mode: ImportMode) => {
        setImportMode(mode);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ─── Fluxo OFX ──────────────────────────────────────────────────────────────
    const processOfxFile = async () => {
        if (!file || !accountId) {
            alert('Selecione um arquivo e uma conta de destino.');
            return;
        }

        setIsLoading(true);
        setAiStatus('Lendo arquivo local...');

        try {
            const text = await file.text();

            const localTransactions = await parseOFX(text);

            if (localTransactions.length === 0) {
                alert('Nenhuma transação encontrada no arquivo OFX/QFX.');
                setIsLoading(false);
                setAiStatus('');
                return;
            }

            const payload = localTransactions.map(t => ({
                ...t,
                accountId,
                creditCardId: creditCardId || undefined
            }));

            setAiStatus('✨ A IA está analisando seus gastos...');
            const response = await api.post('/transactions/import/validate', payload);
            const { preview, skippedCount } = response.data;

            if (skippedCount > 0) {
                console.log(`Silent Skip: ${skippedCount} transações ignoradas (FITID já existia).`);
            }

            buildReviewScreen(preview);
        } catch (error) {
            console.error('Erro ao processar OFX:', error);
            alert('Falha ao processar o arquivo OFX.');
        } finally {
            setIsLoading(false);
            setAiStatus('');
        }
    };

    // ─── Fluxo Foto/Comprovante ──────────────────────────────────────────────────
    const processReceiptFile = async () => {
        if (!file || !accountId) {
            alert('Selecione um arquivo e uma conta de destino.');
            return;
        }

        setIsLoading(true);
        setAiStatus('📷 Enviando comprovante para análise...');

        // Cria preview da imagem/receipt
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setReceiptPreviewUrl(url);
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('accountId', accountId);
            if (creditCardId) formData.append('creditCardId', creditCardId);

            setAiStatus('🤖 IA extraindo dados do comprovante...');
            const response = await api.post('/transactions/import/receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { preview, message, errorCode } = response.data;

            if (!preview || preview.length === 0) {
                const userMsg = ERROR_MESSAGES[errorCode] || message || 'Não foi possível extrair transações deste comprovante. Tente com uma imagem mais nítida.';
                alert(userMsg);
                setIsLoading(false);
                setAiStatus('');
                return;
            }

            buildReviewScreen(preview);
        } catch (error: any) {
            console.error('Erro ao processar comprovante:', error);
            const errorCode = error?.response?.data?.errorCode;
            const userMsg = ERROR_MESSAGES[errorCode] || error?.response?.data?.message || 'Falha ao processar o comprovante. Verifique se a imagem está legível.';
            alert(userMsg);
        } finally {
            setIsLoading(false);
            setAiStatus('');
        }
    };

    const processFile = () => {
        if (importMode === 'ofx') return processOfxFile();
        return processReceiptFile();
    };

    // ─── Monta tela de revisão (Step 2) ─────────────────────────────────────────
    const buildReviewScreen = (preview: any[]) => {
        const uiTransactions: ParsedTransaction[] = preview.map((t: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            fitId: t.fitId,
            date: toYYYYMMDD(t.date),
            description: t.description,
            amount: t.amount,
            type: t.type,
            cnpj: t.cnpj,
            confidence: t.confidence,
            categoryLegacy: t.suggestedCategory || 'Outros',
            categoryId: t.suggestedCategoryId,
            classificationRule: t.suggestedRule || 30,
            suggestedCategory: t.suggestedCategory,
            suggestedCategoryId: t.suggestedCategoryId,
            suggestedIcon: t.suggestedIcon,
            isPotentialDuplicate: t.isFuzzyDuplicate,
            isPreviouslyRejected: t.isPreviouslyRejected,
            // Perda de interesse em placeholders comuns de banco
            selected: !t.isFuzzyDuplicate &&
                !t.isPreviouslyRejected &&
                !['SALDO ANTERIOR', 'SALDO FINAL', 'RESGATE AUTOMATICO', 'APLICACAO'].some(kw => t.description?.toUpperCase().includes(kw)),
        }));

        setParsedTxs(uiTransactions);
        setFilterMode('all');
        setStep(2);
    };

    const toggleSelect = (id: string) => {
        setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
    };

    const updateCategory = (id: string, newCatId: string) => {
        const cat = categories.find(c => c.id === newCatId);
        setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, categoryId: newCatId, categoryLegacy: cat?.name || 'Outros' } : t));
    };

    const updateAmount = (id: string, rawValue: string) => {
        const cleaned = rawValue.replace(/[^0-9.,]/g, '').replace(',', '.');
        const amount = parseFloat(cleaned);
        if (!isNaN(amount) && amount >= 0) {
            setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, amount } : t));
        }
    };

    // ─── Filtro de visualização ──────────────────────────────────────────────────
    const filteredTxs = parsedTxs.filter(tx => {
        if (filterMode === 'new') return !tx.isPreviouslyRejected && !tx.isPotentialDuplicate;
        if (filterMode === 'rejected') return tx.isPreviouslyRejected;
        return true;
    });

    const handleSelectAll = () => {
        const allSelected = filteredTxs.every(t => t.selected);
        setParsedTxs(prev => prev.map(t => {
            if (filteredTxs.some(ft => ft.id === t.id)) {
                return { ...t, selected: !allSelected };
            }
            return t;
        }));
    };

    // ─── Confirmar importação ────────────────────────────────────────────────────
    const handleSubmit = async () => {
        const selectedTxs = parsedTxs.filter(t => t.selected);
        if (selectedTxs.length === 0 || !accountId) return;

        setIsLoading(true);

        // FITIDs que estavam na lista mas foram desmarcados pelo usuário
        const rejectedFitIds = parsedTxs
            .filter(t => !t.selected && t.fitId)
            .map(t => t.fitId as string);

        const payload = {
            transactions: selectedTxs.map(t => ({
                description: t.description,
                amount: t.amount,
                date: t.date,
                type: t.type,
                fitId: t.fitId,
                classificationRule: t.classificationRule,
                categoryId: t.categoryId,
                categoryLegacy: t.categoryLegacy,
                accountId,
                creditCardId: creditCardId || undefined
            })),
            rejectedFitIds,
        };

        try {
            const res = await api.post('/transactions/import/confirm', payload);
            alert(`${res.data.importedCount} transações importadas com sucesso!`);
            onImportSuccess();
            onClose();
        } catch (error) {
            console.error('Erro na importação:', error);
            alert('Falha ao importar as transações. Verifique se não são duplicadas.');
        } finally {
            setIsLoading(false);
        }
    };

    const rejectedCount = parsedTxs.filter(t => t.isPreviouslyRejected).length;

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all duration-300">
            <div className={`bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full ${step === 2 ? 'max-w-5xl' : 'max-w-lg'} overflow-hidden animate-in zoom-in-95 duration-300 transition-all border border-slate-200 dark:border-slate-800`}>
                <div className="px-8 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Processamento</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${step === 2 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'}`}>
                                {step === 2 ? <CheckSquare className="w-6 h-6" /> : <UploadCloud className="w-6 h-6" />}
                            </div>
                            {step === 1 ? 'Importar Extrato' : 'Revisar & Confirmar'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all active:scale-95">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ─── Step 1: Seleção de arquivo ─────────────────────────────────────── */}
                {step === 1 && (
                    <div className="p-8 space-y-8">
                        {/* Seletor de modo de importação */}
                        <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-[1.5rem] border border-slate-200/50 dark:border-slate-800/50">
                            <button
                                onClick={() => switchMode('ofx')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${importMode === 'ofx'
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xl shadow-indigo-600/10'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                <span className="hidden sm:inline">Extrato</span> OFX / QFX
                            </button>
                            <button
                                onClick={() => switchMode('receipt')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${importMode === 'receipt'
                                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xl shadow-violet-600/10'
                                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                                    }`}
                            >
                                <Camera className="w-4 h-4" />
                                <span className="hidden sm:inline">Foto /</span> Comprovante
                            </button>
                        </div>

                        {/* Conta e cartão */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Conta de Destino</label>
                                <div className="relative group">
                                    <select required value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer">
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
                                    <select value={creditCardId} onChange={e => setCreditCardId(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none cursor-pointer">
                                        <option value="">Nenhum Cartão</option>
                                        {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <ChevronDown className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Dica contextual */}
                        {importMode === 'receipt' && (
                            <div className="flex items-start gap-4 p-5 bg-violet-50 dark:bg-violet-500/10 rounded-2xl border border-violet-100 dark:border-violet-500/20">
                                <Sparkles className="w-5 h-5 text-violet-500 mt-0.5 shrink-0 animate-pulse" />
                                <p className="text-xs text-violet-700 dark:text-violet-300 font-bold leading-relaxed">
                                    Envie fotos de comprovantes de PIX, TED, DOC ou recibos de mercado. Nossa IA extrairá os dados e sugerirá a melhor categoria automaticamente.
                                </p>
                            </div>
                        )}

                        {/* Área de upload */}
                        <div
                            className={`border-4 border-dashed rounded-[2rem] p-10 text-center transition-all cursor-pointer group hover:scale-[1.01] active:scale-[0.99] ${file
                                ? (importMode === 'receipt' ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-500/5' : 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/5')
                                : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/50'
                                }`}
                            onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                accept={importMode === 'ofx' ? OFX_ACCEPT : RECEIPT_ACCEPT}
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            {file ? (
                                <div className="space-y-3">
                                    <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg ${importMode === 'receipt' ? 'bg-violet-600 text-white' : 'bg-indigo-600 text-white'}`}>
                                        <Check className="w-8 h-8" />
                                    </div>
                                    <p className="font-black text-slate-800 dark:text-white text-lg tracking-tight truncate max-w-xs mx-auto">{file.name}</p>
                                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{(file.size / 1024).toFixed(1)} KB pronto para análise</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto transition-colors group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10">
                                        {importMode === 'receipt' ? <Image className="w-8 h-8 text-slate-400 group-hover:text-violet-500 transition-colors" /> : <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black text-slate-800 dark:text-white text-lg tracking-tight">
                                            {importMode === 'ofx'
                                                ? 'Arraste seu arquivo OFX'
                                                : 'Arraste a foto ou PDF'}
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
                                    onClick={processFile}
                                    disabled={!file || !accountId || isLoading}
                                    className={`flex-1 flex gap-3 items-center justify-center px-6 py-5 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl disabled:opacity-50 transition-all active:scale-95 ${importMode === 'receipt'
                                        ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                                        }`}
                                >
                                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                    {isLoading ? 'IA Processando...' : (importMode === 'receipt' ? 'Extrair com IA' : 'Processar & Categorizar')}
                                </button>
                            </div>

                            {aiStatus && (
                                <div className="text-center p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20">
                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] animate-pulse">{aiStatus}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Step 2: Revisão ─────────────────────────────────────────────────── */}
                {step === 2 && (
                    <div className="flex flex-col h-[75vh] max-h-[800px]">
                        <div className="px-8 py-5 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-100 dark:border-amber-500/20 flex items-start gap-4">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
                            <p className="text-sm text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                                Revisamos seu extrato e categorizamos o que foi possível. <span className="font-black">Verifique os valores e desmarque o que não deseja importar.</span>
                            </p>
                        </div>

                        {/* Receipt preview thumbnail */}
                        {receiptPreviewUrl && (
                            <div className="px-8 py-3 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
                                <Image className="w-4 h-4 text-slate-400 shrink-0" />
                                <img
                                    src={receiptPreviewUrl}
                                    alt="Preview do comprovante"
                                    className="h-16 w-auto rounded-xl border border-slate-200 dark:border-slate-700 object-contain bg-white dark:bg-slate-900 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(receiptPreviewUrl, '_blank')}
                                />
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Clique para ampliar</span>
                            </div>
                        )}

                        {/* Filtros rápidos */}
                        <div className="px-8 py-6 flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
                            <div className="flex gap-3">
                                {(['all', 'new', 'rejected'] as FilterMode[]).map(f => {
                                    const labels = { all: `Tudo (${parsedTxs.length})`, new: 'Novos Lançamentos', rejected: `Rejeitados (${rejectedCount})` };
                                    const isActive = filterMode === f;
                                    return (
                                        <button
                                            key={f}
                                            onClick={() => setFilterMode(f)}
                                            className={`text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-all active:scale-95 border ${isActive
                                                ? (f === 'rejected' ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20')
                                                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-500'
                                                }`}
                                        >
                                            {labels[f]}
                                        </button>
                                    );
                                })}
                            </div>

                            {filteredTxs.length > 0 && (
                                <button
                                    onClick={handleSelectAll}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                >
                                    {filteredTxs.every(t => t.selected) ? (
                                        <>
                                            <X className="w-4 h-4" /> Desmarcar Todos
                                        </>
                                    ) : (
                                        <>
                                            <CheckSquare className="w-4 h-4" /> Selecionar Todos
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50 p-8">
                            {filteredTxs.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
                                    <Inbox className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="text-sm font-black uppercase tracking-widest opacity-60">Nada por aqui</p>
                                </div>
                            )}
                            <div className="grid grid-cols-1 gap-4">
                                {filteredTxs.map(tx => (
                                    <div key={tx.id} className={`flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[2rem] border transition-all duration-300 ${tx.isPreviouslyRejected
                                        ? 'border-red-200 dark:border-red-500/30 bg-red-50/20 dark:bg-red-500/5'
                                        : tx.isPotentialDuplicate
                                            ? 'border-orange-200 dark:border-orange-500/30 bg-orange-50/40 dark:bg-orange-500/5'
                                            : tx.selected ? 'bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-500/30 shadow-xl shadow-indigo-500/5' : 'bg-slate-100/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 opacity-60'
                                        }`}>
                                        <div className="flex items-center gap-6 w-full sm:w-auto">
                                            <div className="relative">
                                                <input
                                                    type="checkbox"
                                                    id={`tx-${tx.id}`}
                                                    checked={tx.selected}
                                                    onChange={() => toggleSelect(tx.id)}
                                                    className="w-6 h-6 rounded-lg border-2 border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-4 focus:ring-indigo-500/20 transition-all cursor-pointer"
                                                />
                                            </div>
                                        <div className="w-36 shrink-0">
                                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{tx.date.split('-').reverse().join('/')}</p>
                                            <div className="relative group/amount">
                                                <input
                                                    type="text"
                                                    value={tx.amount.toFixed(2)}
                                                    onChange={e => updateAmount(tx.id, e.target.value)}
                                                    className={`w-full bg-transparent text-xl font-black tracking-tighter focus:outline-none border-b-2 border-transparent focus:border-indigo-500 transition-all ${
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
                                                <input
                                                    type="text"
                                                    value={tx.description}
                                                    onChange={e => setParsedTxs(prev => prev.map(t => t.id === tx.id ? { ...t, description: e.target.value } : t))}
                                                    className="w-full bg-transparent text-lg font-black text-slate-800 dark:text-white focus:outline-none border-b-2 border-transparent focus:border-indigo-500 transition-all tracking-tight"
                                                />
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                {tx.suggestedCategory && (
                                                    <span className="text-[9px] px-3 py-1 rounded-lg border-2 border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 flex items-center gap-2 font-black uppercase tracking-widest">
                                                        <span>{tx.suggestedIcon}</span>
                                                        {tx.suggestedCategory}
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
                                                        <Sparkles className="w-3 h-3" />
                                                        IA: {tx.confidence}%
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-full sm:w-64 shrink-0">
                                            <div className="relative group">
                                                <select
                                                    value={tx.categoryId || ''}
                                                    onChange={(e) => updateCategory(tx.id, e.target.value)}
                                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs font-black text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer"
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
                                                                    ['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Combustível / Gasolina', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais']
                                                                        .includes(c.name)
                                                                ).map(c => (
                                                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                                ))}
                                                            </optgroup>

                                                            <optgroup label="Desejos (Estilo de Vida)">
                                                                {categories.filter(c =>
                                                                    ['Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Cuidados com Pets', 'Viagens']
                                                                        .includes(c.name)
                                                                ).map(c => (
                                                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                                ))}
                                                            </optgroup>

                                                            <optgroup label="Objetivos (Quitação e Reserva)">
                                                                {categories.filter(c =>
                                                                    ['Aplicações / Poupança', 'Pagamento de Dívidas']
                                                                        .includes(c.name)
                                                                ).map(c => (
                                                                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                                ))}
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
                                ))}
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900">
                            <button onClick={() => setStep(1)} className="w-full sm:w-auto px-8 py-4 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95">
                                Alterar Arquivo
                            </button>
                            <button onClick={handleSubmit} disabled={isLoading || parsedTxs.filter(t => t.selected).length === 0} className="w-full sm:w-auto px-10 py-5 text-white font-black uppercase tracking-widest text-xs bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                {isLoading ? 'Finalizando...' : `Importar ${parsedTxs.filter(t => t.selected).length} Transações`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
