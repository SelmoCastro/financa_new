import React, { useState, useRef } from 'react';
import api from '../services/api';
import { Account, CreditCard } from '../types';

interface ImportOverlayProps {
    onImportSuccess: () => void;
    onClose: () => void;
    accounts: Account[];
    creditCards: CreditCard[];
    existingTransactions?: any[];
}

import { parseOFX } from '../utils/ofxParser';

interface ParsedTransaction {
    id: string; // Internal temporary ID
    fitId?: string;
    date: string;
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    categoryLegacy: string;
    classificationRule?: number; // 50, 30, ou 20
    suggestedCategory?: string;
    suggestedIcon?: string;
    selected: boolean;
    isPotentialDuplicate?: boolean;
}

export const ImportOverlay: React.FC<ImportOverlayProps> = ({ onImportSuccess, onClose, accounts, creditCards, existingTransactions = [] }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [file, setFile] = useState<File | null>(null);
    const [parsedTxs, setParsedTxs] = useState<ParsedTransaction[]>([]);
    const [accountId, setAccountId] = useState('');
    const [creditCardId, setCreditCardId] = useState('');
    const [bankType, setBankType] = useState('OFX_GENERIC'); // Padronizado provisoriamente
    const [isLoading, setIsLoading] = useState(false);
    const [aiStatus, setAiStatus] = useState(''); // Status visual para o usuário
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const processFile = async () => {
        if (!file || !accountId) {
            alert('Selecione um arquivo e uma conta de destino.');
            return;
        }

        setIsLoading(true);
        setAiStatus('Lendo arquivo local...');

        try {
            const text = await file.text();

            // 1. Parse Seguro Local (Dumb Parser)
            let localTransactions = [];
            if (file.name.toLowerCase().endsWith('.ofx') || file.name.toLowerCase().endsWith('.qfx')) {
                localTransactions = await parseOFX(text);
            } else {
                alert('Por favor, envie um arquivo .ofx ou .qfx. O suporte a CSV legado foi desativado para garantir a integridade dos seus dados.');
                setIsLoading(false);
                return;
            }

            if (localTransactions.length === 0) {
                alert('Nenhuma transação encontrada no arquivo OFX/QFX.');
                setIsLoading(false);
                return;
            }

            // Preparando Payload
            const payload = localTransactions.map(t => ({
                ...t,
                accountId,
                creditCardId: creditCardId || undefined
            }));

            // 2. Draft/Preview API - O Cérebro Backend
            setAiStatus('✨ A IA está analisando seus gastos...');
            const response = await api.post('/transactions/import/validate', payload);
            const { preview, skippedCount } = response.data;

            if (skippedCount > 0) {
                console.log(`Silent Skip: ${skippedCount} transações ignoradas pois já existiam no banco (FITID Exato).`);
            }

            // 3. Montar a Tela de Revisão
            const uiTransactions: ParsedTransaction[] = preview.map((t: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                fitId: t.fitId,
                date: t.date.split('T')[0],
                description: t.description,
                amount: t.amount,
                type: t.type,
                categoryLegacy: t.suggestedCategory || 'Outros',
                classificationRule: t.suggestedRule || 30,
                suggestedCategory: t.suggestedCategory,
                suggestedIcon: t.suggestedIcon,
                isPotentialDuplicate: t.isFuzzyDuplicate, // Do BD Frontend (Data + Valor idênticos)
                selected: !t.isFuzzyDuplicate // Só vem selecionado se tiver certeza que é novo
            }));

            setParsedTxs(uiTransactions);
            setStep(2);

        } catch (error) {
            console.error('Erro ao processar arquivo:', error);
            alert('Falha ao processar arquivo ou integrar com IA.');
        } finally {
            setIsLoading(false);
            setAiStatus('');
        }
    };

    const toggleSelect = (id: string) => {
        setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
    };

    const updateCategory = (id: string, newCat: string) => {
        setParsedTxs(prev => prev.map(t => t.id === id ? { ...t, categoryLegacy: newCat } : t));
    };

    const handleSubmit = async () => {
        const selectedTxs = parsedTxs.filter(t => t.selected);
        if (selectedTxs.length === 0 || !accountId) return;

        setIsLoading(true);

        const payload = selectedTxs.map(t => ({
            description: t.description,
            amount: t.amount,
            date: t.date,
            type: t.type,
            fitId: t.fitId,
            classificationRule: t.classificationRule,
            categoryLegacy: t.categoryLegacy,
            accountId,
            creditCardId: creditCardId || undefined
        }));

        try {
            const res = await api.post('/transactions/import/confirm', payload);
            alert(`${res.data.importedCount} transações importadas com sucesso!`);
            onImportSuccess();
            onClose();
        } catch (error) {
            console.error('Erro na importação:', error);
            alert('Falha ao importar as transações. Elas podem ser duplicadas.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className={`bg-white rounded-[2rem] shadow-2xl w-full ${step === 2 ? 'max-w-4xl' : 'max-w-lg'} overflow-hidden animate-in zoom-in-95 duration-200 transition-all`}>
                <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${step === 2 ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                            <i data-lucide={step === 2 ? 'check-square' : 'upload-cloud'} className="w-5 h-5"></i>
                        </div>
                        {step === 1 ? 'Importar Extrato CSV' : 'Revisar & Importar'}
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                        <i data-lucide="x" className="w-5 h-5"></i>
                    </button>
                </div>

                {step === 1 && (
                    <div className="p-6 space-y-5">
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

                        {/* Formato de Extrato Removido - Agora o Parser de OFX é Universal para todos os Bancos */}

                        <div
                            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer ${file ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-200 hover:bg-slate-50'}`}
                            onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDrop={handleDrop}
                        >
                            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                            {file ? (
                                <div className="space-y-2">
                                    <i data-lucide="file-check-2" className="w-10 h-10 text-indigo-500 mx-auto"></i>
                                    <p className="font-bold text-slate-700">{file.name}</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <i data-lucide="file-spreadsheet" className="w-10 h-10 text-slate-400 mx-auto"></i>
                                    <p className="font-bold text-slate-700">Selecione ou arraste seu CSV</p>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button onClick={onClose} disabled={isLoading} className="flex-[0.5] px-4 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50">Cancelar</button>
                                <button onClick={processFile} disabled={!file || !accountId || isLoading} className="flex-1 flex gap-2 justify-center px-4 py-3 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                                    {isLoading ? <i data-lucide="loader-2" className="w-5 h-5 animate-spin"></i> : <i data-lucide="sparkles" className="w-5 h-5"></i>}
                                    {isLoading ? 'Analisando...' : 'Lançar & Revisar com IA'}
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

                {step === 2 && (
                    <div className="flex flex-col h-[70vh] max-h-[700px]">
                        <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-start gap-3">
                            <i data-lucide="alert-triangle" className="w-5 h-5 text-amber-500 mt-0.5 shrink-0"></i>
                            <p className="text-sm text-amber-800 font-medium">Revisamos seu extrato e categorizamos o que foi possível. Desmarque transações indesejadas e confirme a categoria antes de salvar. Transações que já existirem em nossa base na cópia exata de <b>Data + Valor + Nome</b> serão descartadas automaticamente.</p>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50 p-6">
                            <div className="space-y-3">
                                {parsedTxs.map(tx => (
                                    <div key={tx.id} className={`flex items-center gap-4 bg-white p-4 rounded-2xl border transition-colors ${tx.isPotentialDuplicate
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
                                            {tx.isPotentialDuplicate && (
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
                                                value={tx.categoryLegacy}
                                                onChange={(e) => updateCategory(tx.id, e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            >
                                                <optgroup label="Receitas">
                                                    <option value="Salário">Salário</option>
                                                    <option value="Freelance">Freelance / Renda Extra</option>
                                                    <option value="Investimentos">Rendimento de Investimentos</option>
                                                    <option value="Entradas">Transferência Recebida</option>
                                                </optgroup>
                                                <optgroup label="Alimentação">
                                                    <option value="Alimentação">Alimentação / Mercado</option>
                                                    <option value="Restaurante">Restaurante / Delivery</option>
                                                </optgroup>
                                                <optgroup label="Moradia">
                                                    <option value="Moradia">Aluguel / Condomínio</option>
                                                    <option value="Contas e Serviços">Contas e Serviços (Luz, Água, Gás)</option>
                                                </optgroup>
                                                <optgroup label="Transporte">
                                                    <option value="Transporte">Transporte / Combustível</option>
                                                </optgroup>
                                                <optgroup label="Saúde e Educação">
                                                    <option value="Saúde">Saúde / Farmácia</option>
                                                    <option value="Educação">Educação / Cursos</option>
                                                </optgroup>
                                                <optgroup label="Outros Gastos">
                                                    <option value="Compras">Compras / Vestuário</option>
                                                    <option value="Lazer">Lazer / Entretenimento</option>
                                                    <option value="Assinaturas">Assinaturas (Netflix, Spotify...)</option>
                                                    <option value="Impostos">Impostos / Taxas</option>
                                                    <option value="Transferência">Transferência Enviada</option>
                                                    <option value="Outros">Outros</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white">
                            <button onClick={() => setStep(1)} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Voltar</button>
                            <button onClick={handleSubmit} disabled={isLoading} className="px-8 py-3 text-white font-black bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2">
                                {isLoading ? 'Salvando...' : `Confirmar ${parsedTxs.filter(t => t.selected).length} Transações`}
                                <i data-lucide="check" className="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
