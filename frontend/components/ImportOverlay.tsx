import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { Account, CreditCard, Category } from '../types';

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
    isPreviouslyRejected?: boolean; // novo: foi rejeitado em importação anterior
}

type ImportMode = 'ofx' | 'receipt';
type FilterMode = 'all' | 'new' | 'rejected';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
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

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('accountId', accountId);
            if (creditCardId) formData.append('creditCardId', creditCardId);

            setAiStatus('🤖 IA extraindo dados do comprovante...');
            const response = await api.post('/transactions/import/receipt', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { preview } = response.data;

            if (!preview || preview.length === 0) {
                alert('Não foi possível extrair transações deste comprovante. Tente com uma imagem mais nítida.');
                setIsLoading(false);
                setAiStatus('');
                return;
            }

            buildReviewScreen(preview);
        } catch (error: any) {
            console.error('Erro ao processar comprovante:', error);
            const msg = error?.response?.data?.message || 'Falha ao processar o comprovante. Verifique se a imagem está legível.';
            alert(msg);
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

    // ─── Filtro de visualização ──────────────────────────────────────────────────
    const filteredTxs = parsedTxs.filter(tx => {
        if (filterMode === 'new') return !tx.isPreviouslyRejected && !tx.isPotentialDuplicate;
        if (filterMode === 'rejected') return tx.isPreviouslyRejected;
        return true;
    });

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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`bg-white rounded-[2rem] shadow-2xl w-full ${step === 2 ? 'max-w-4xl' : 'max-w-lg'} overflow-hidden animate-in zoom-in-95 duration-200 transition-all`}>
                <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step === 2 ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            <i data-lucide={step === 2 ? 'check-square' : 'upload-cloud'} className="w-5 h-5"></i>
                        </div>
                        {step === 1 ? 'Importar Extrato' : 'Revisar & Importar'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <i data-lucide="x" className="w-5 h-5"></i>
                    </button>
                </div>

                {/* ─── Step 1: Seleção de arquivo ─────────────────────────────────────── */}
                {step === 1 && (
                    <div className="p-6 space-y-5">
                        {/* Seletor de modo de importação */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
                            <button
                                onClick={() => switchMode('ofx')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${importMode === 'ofx'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <i data-lucide="file-spreadsheet" className="w-4 h-4"></i>
                                Extrato OFX / QFX
                            </button>
                            <button
                                onClick={() => switchMode('receipt')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${importMode === 'receipt'
                                    ? 'bg-white text-violet-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <i data-lucide="camera" className="w-4 h-4"></i>
                                Foto / Comprovante
                            </button>
                        </div>

                        {/* Conta e cartão */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Conta de Destino</label>
                                <select required value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                    <option value="" disabled>Selecione a Conta...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Cartão (Opcional)</label>
                                <select value={creditCardId} onChange={e => setCreditCardId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                    <option value="">Nenhum Cartão</option>
                                    {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Dica contextual */}
                        {importMode === 'receipt' && (
                            <div className="flex items-start gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
                                <i data-lucide="info" className="w-4 h-4 text-violet-500 mt-0.5 shrink-0"></i>
                                <p className="text-xs text-violet-700 font-medium">Envie fotos de comprovantes de PIX, TED, DOC ou recibos de mercado. A IA extrairá os dados automaticamente.</p>
                            </div>
                        )}

                        {/* Área de upload */}
                        <div
                            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${file
                                ? (importMode === 'receipt' ? 'border-violet-500 bg-violet-50/50' : 'border-indigo-500 bg-indigo-50/50')
                                : 'border-slate-200 hover:bg-slate-50'
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
                                <div className="space-y-2">
                                    <i data-lucide="file-check-2" className={`w-10 h-10 mx-auto ${importMode === 'receipt' ? 'text-violet-500' : 'text-indigo-500'}`}></i>
                                    <p className="font-bold text-slate-700">{file.name}</p>
                                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <i data-lucide={importMode === 'receipt' ? 'image' : 'file-spreadsheet'} className="w-10 h-10 text-slate-400 mx-auto"></i>
                                    <p className="font-bold text-slate-700">
                                        {importMode === 'ofx'
                                            ? 'Selecione ou arraste seu OFX / QFX'
                                            : 'Selecione ou arraste a foto / comprovante'}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {importMode === 'ofx' ? 'Formato: .ofx, .qfx' : 'Formato: JPG, PNG, WEBP, PDF • Máx. 10MB'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="pt-2 flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button onClick={onClose} disabled={isLoading} className="flex-[0.5] px-4 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">Cancelar</button>
                                <button
                                    onClick={processFile}
                                    disabled={!file || !accountId || isLoading}
                                    className={`flex-1 flex gap-2 justify-center px-4 py-3 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all ${importMode === 'receipt'
                                        ? 'bg-violet-600 hover:bg-violet-700 shadow-violet-600/20'
                                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                                        }`}
                                >
                                    {isLoading ? <i data-lucide="loader-2" className="w-5 h-5 animate-spin"></i> : <i data-lucide="sparkles" className="w-5 h-5"></i>}
                                    {isLoading ? 'Analisando...' : (importMode === 'receipt' ? 'Analisar com IA' : 'Lançar & Revisar com IA')}
                                </button>
                            </div>

                            {aiStatus && (
                                <div className="text-center p-2 rounded-lg bg-indigo-50">
                                    <p className="text-xs font-semibold text-indigo-600 animate-pulse">{aiStatus}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Step 2: Revisão ─────────────────────────────────────────────────── */}
                {step === 2 && (
                    <div className="flex flex-col h-[70vh] max-h-[700px]">
                        <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-start gap-3">
                            <i data-lucide="alert-triangle" className="w-5 h-5 text-amber-500 mt-0.5 shrink-0"></i>
                            <p className="text-sm text-amber-800 font-medium">Revisamos seu extrato e categorizamos o que foi possível. Desmarque transações indesejadas antes de salvar.</p>
                        </div>

                        {/* Filtros rápidos */}
                        <div className="px-6 pt-4 pb-2 flex gap-2 border-b border-slate-100">
                            {(['all', 'new', 'rejected'] as FilterMode[]).map(f => {
                                const labels = { all: `Todas (${parsedTxs.length})`, new: 'Novas', rejected: `Rejeitadas antes (${rejectedCount})` };
                                const isActive = filterMode === f;
                                return (
                                    <button
                                        key={f}
                                        onClick={() => setFilterMode(f)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isActive
                                            ? (f === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-indigo-100 text-indigo-700')
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                    >
                                        {labels[f]}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50 p-6">
                            {filteredTxs.length === 0 && (
                                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                                    <i data-lucide="inbox" className="w-8 h-8 mb-2"></i>
                                    <p className="text-sm font-medium">Nenhuma transação nesta categoria</p>
                                </div>
                            )}
                            <div className="space-y-3">
                                {filteredTxs.map(tx => (
                                    <div key={tx.id} className={`flex items-center gap-4 bg-white p-4 rounded-2xl border transition-colors ${tx.isPreviouslyRejected
                                        ? 'border-red-200 bg-red-50/20'
                                        : tx.isPotentialDuplicate
                                            ? 'border-orange-300 bg-orange-50/40'
                                            : tx.selected ? 'border-indigo-200 shadow-sm' : 'border-slate-200 opacity-50'
                                        }`}>
                                        <input
                                            type="checkbox"
                                            checked={tx.selected}
                                            onChange={() => toggleSelect(tx.id)}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="w-28 shrink-0">
                                            <span className="text-xs font-bold text-slate-400 block">{tx.date.split('-').reverse().join('/')}</span>
                                            <span className={`text-sm font-black ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-700'}`}>R$ {tx.amount.toLocaleString('pt-BR')}</span>
                                            {tx.isPreviouslyRejected && (
                                                <span className="text-[10px] font-bold text-red-500 block mt-0.5">⛔ Rejeitada antes</span>
                                            )}
                                            {!tx.isPreviouslyRejected && tx.isPotentialDuplicate && (
                                                <span className="text-[10px] font-bold text-orange-500 block mt-0.5">⚠️ Possível duplicata</span>
                                            )}
                                        </div>
                                        <div className="flex-1 flex flex-col gap-2">
                                            <input
                                                type="text"
                                                value={tx.description}
                                                onChange={e => setParsedTxs(prev => prev.map(t => t.id === tx.id ? { ...t, description: e.target.value } : t))}
                                                className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none focus:border-b border-indigo-200"
                                            />
                                            {tx.suggestedCategory && (
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-xs px-2 py-0.5 rounded outline outline-1 outline-indigo-200 bg-indigo-50 text-indigo-700 flex items-center gap-1 font-semibold">
                                                        <span>{tx.suggestedIcon}</span>
                                                        {tx.suggestedCategory}
                                                    </span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                                        Regra {tx.classificationRule}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="w-48 shrink-0">
                                            <select
                                                value={tx.categoryId || ''}
                                                onChange={(e) => updateCategory(tx.id, e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="" disabled>Escolha uma categoria...</option>

                                                <optgroup label="Entradas (Rendas)">
                                                    {categories.filter(c => c.type === 'INCOME').map(c => (
                                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                    ))}
                                                </optgroup>

                                                {tx.type === 'EXPENSE' && (
                                                    <>
                                                        <optgroup label="Necessidades (Essencial)">
                                                            {categories.filter(c =>
                                                                ['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais']
                                                                    .includes(c.name)
                                                            ).map(c => (
                                                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                            ))}
                                                        </optgroup>

                                                        <optgroup label="Desejos (Estilo de Vida)">
                                                            {categories.filter(c =>
                                                                ['Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Viagens']
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

                                                        {categories.filter(c =>
                                                            !['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais',
                                                                'Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Viagens',
                                                                'Aplicações / Poupança', 'Pagamento de Dívidas'].includes(c.name) && c.type === 'EXPENSE'
                                                        ).length > 0 && (
                                                                <optgroup label="Outras Despesas">
                                                                    {categories.filter(c =>
                                                                        !['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais',
                                                                            'Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Viagens',
                                                                            'Aplicações / Poupança', 'Pagamento de Dívidas'].includes(c.name) && c.type === 'EXPENSE'
                                                                    ).map(c => (
                                                                        <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                                                    ))}
                                                                </optgroup>
                                                            )}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white">
                            <button onClick={() => setStep(1)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Voltar</button>
                            <button onClick={handleSubmit} disabled={isLoading || parsedTxs.filter(t => t.selected).length === 0} className="px-8 py-3 text-white font-black bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50">
                                {isLoading ? 'Salvando...' : `Confirmar ${parsedTxs.filter(t => t.selected).length} Transações`}
                                <i data-lucide="check" className="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
