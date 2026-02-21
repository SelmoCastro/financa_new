import React, { useState, useRef } from 'react';
import api from '../services/api';
import { Account, CreditCard } from '../types';

interface ImportOverlayProps {
    onImportSuccess: () => void;
    onClose: () => void;
    accounts: Account[];
    creditCards: CreditCard[];
}

interface ParsedTransaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    categoryLegacy: string;
    selected: boolean;
}

export const ImportOverlay: React.FC<ImportOverlayProps> = ({ onImportSuccess, onClose, accounts, creditCards }) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [file, setFile] = useState<File | null>(null);
    const [parsedTxs, setParsedTxs] = useState<ParsedTransaction[]>([]);
    const [accountId, setAccountId] = useState('');
    const [creditCardId, setCreditCardId] = useState('');
    const [bankType, setBankType] = useState('INTER');
    const [isLoading, setIsLoading] = useState(false);
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

    const parseCSV = async () => {
        if (!file) return;
        const text = await file.text();
        const lines = text.split('\n');
        const parsed: ParsedTransaction[] = [];

        let isHeader = true;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            if (isHeader) { isHeader = false; continue; }

            // Suporta formato "valor1","valor2" ou ponto-e-vírgula
            let cols = line.split('","').map(c => c.replace(/^"|"$/g, ''));
            if (cols.length < 5) cols = line.split(';').map(c => c.replace(/^"|"$/g, ''));

            if (cols.length >= 4) {
                let dateStr = cols[0];
                let desc1 = cols[1] || '';
                let desc2 = cols[2] || '';
                let valStr = cols[4] || cols[3];
                let tipoStr = '';

                if (bankType === 'NUBANK') {
                    // Nubank CSV: Data,Valor,Identificador,Descrição
                    valStr = cols[1];
                } else if (bankType === 'BB') {
                    // Banco do Brasil CSV: "Data","Lançamento","Detalhes","Nº documento","Valor","Tipo Lançamento"
                    dateStr = cols[0];
                    desc1 = cols[1]; // Lançamento (ex: "Pix - Enviado")
                    desc2 = cols[2]; // Detalhes (ex: "07:42 AUTO POSTO COLORADO")
                    valStr = cols[4]; // Valor (ex: "-50,00")
                    tipoStr = (cols[5] || '').toLowerCase(); // "entrada" / "saída"
                }

                // Filtro genérico: ignorar linhas de saldo (não são transações)
                const descCombinada = `${desc1} ${desc2}`.toLowerCase().trim();
                const PADROES_SALDO = [
                    'saldo anterior', 'saldo do dia', 'saldo final', 'saldo em',
                    'saldo disponivel', 'saldo devedor', 'saldo', 's a l d o'
                ];
                // Só ignora se a descrição for APENAS sobre saldo (sem outras palavras ricas)
                if (PADROES_SALDO.some(p => descCombinada === p || descCombinada.startsWith(p + ' ') && descCombinada.length < 30)) continue;

                if (!dateStr || !valStr) continue;

                // Data YYYY-MM-DD
                let date = dateStr;
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) date = `${parts[2]}-${parts[1]}-${parts[0]}`;
                }

                const rawVal = valStr.replace(/\./g, '').replace(',', '.');
                const amount = parseFloat(rawVal);
                if (isNaN(amount)) continue;

                // Para BB: usar a coluna "Tipo Lançamento" (Entrada/Saída). Para outros: usar sinal do valor
                let type: 'INCOME' | 'EXPENSE';
                if (bankType === 'BB' && tipoStr) {
                    type = tipoStr.includes('entrada') ? 'INCOME' : 'EXPENSE';
                } else {
                    type = amount >= 0 ? 'INCOME' : 'EXPENSE';
                }

                // Para BB: combinar Lançamento + Detalhes. Se Detalhes for mais descritivo, usar ele
                const finalDesc = (desc2 && desc2.length > 5) ? `${desc1} - ${desc2}`.trim() : (desc1 || 'Transação CSV');

                // Tinder Financeiro: Categorização por Palavra-Chave
                let categoryLegacy = 'Outros';
                const lower = finalDesc.toLowerCase();
                if (lower.includes('uber') || lower.includes('99app') || lower.includes('posto')) categoryLegacy = 'Transporte';
                else if (lower.includes('ifood') || lower.includes('mercado') || lower.includes('padaria') || lower.includes('restaurante')) categoryLegacy = 'Alimentação';
                else if (lower.includes('farmacia') || lower.includes('drogaria') || lower.includes('saude')) categoryLegacy = 'Saúde';
                else if (lower.includes('pagamento') || lower.includes('salario')) categoryLegacy = 'Entradas';

                parsed.push({
                    id: Math.random().toString(36).substr(2, 9),
                    date,
                    description: finalDesc || 'Transação CSV',
                    amount: Math.abs(amount),
                    type,
                    categoryLegacy,
                    selected: true
                });
            }
        }
        setParsedTxs(parsed);
        setStep(2);
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
            date: new Date(`${t.date}T12:00:00Z`).toISOString(),
            type: t.type,
            isFixed: false,
            categoryLegacy: t.categoryLegacy,
            accountId,
            creditCardId: creditCardId || undefined,
        }));

        try {
            const res = await api.post('/transactions/import', payload);
            alert(`${res.data.importedCount} de ${selectedTxs.length} transações foram salvas com sucesso.\n${res.data.duplicateCount} foram ignoradas por já existirem no sistema.`);
            onImportSuccess();
        } catch (error) {
            console.error('Import error:', error);
            alert('Houve um erro durante a gravação das transações. Tente novamente.');
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

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Formato do Extrato</label>
                            <select value={bankType} onChange={e => setBankType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none">
                                <option value="INTER">Banco Inter / Padrão (Data, Docs, Valor, Tipo)</option>
                                <option value="NUBANK">Nubank</option>
                                <option value="BB">Banco do Brasil</option>
                            </select>
                        </div>

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

                        <div className="pt-4 flex gap-3">
                            <button onClick={onClose} className="flex-1 px-4 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
                            <button onClick={parseCSV} disabled={!file || !accountId} className="flex-1 px-4 py-3 text-white font-bold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50">Lançar & Revisar</button>
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
                                    <div key={tx.id} className={`flex items-center gap-4 bg-white p-4 rounded-2xl border transition-colors ${tx.selected ? 'border-indigo-200 shadow-sm' : 'border-slate-200 opacity-50'}`}>
                                        <input
                                            type="checkbox"
                                            checked={tx.selected}
                                            onChange={() => toggleSelect(tx.id)}
                                            className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div className="w-24 shrink-0">
                                            <span className="text-xs font-bold text-slate-400 block">{tx.date.split('-').reverse().join('/')}</span>
                                            <span className={`text-sm font-black ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-700'}`}>R$ {tx.amount.toLocaleString('pt-BR')}</span>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={tx.description}
                                                onChange={e => setParsedTxs(prev => prev.map(t => t.id === tx.id ? { ...t, description: e.target.value } : t))}
                                                className="w-full bg-transparent text-sm font-bold text-slate-800 focus:outline-none focus:border-b border-indigo-200"
                                            />
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
        </div>
    );
};
