import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface Budget {
    id: string;
    category: string;
    amount: number;
    spent: number;
    percentage: number;
    isOverBudget: boolean;
}

interface BudgetsViewProps {
    existingCategories: string[];
    isPrivacyEnabled: boolean;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({ existingCategories, isPrivacyEnabled }) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ category: '', amount: '' });
    const { addToast } = useToast();

    const fetchBudgets = async () => {
        try {
            const response = await api.get('/budgets');
            setBudgets(response.data);
        } catch (error) {
            console.error('Erro ao buscar orçamentos:', error);
            addToast('Erro ao carregar orçamentos', 'error');
        } finally {
            setIsLoading(false);
        }
    };


    useEffect(() => {
        fetchBudgets();
    }, []);

    useEffect(() => {
        // @ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }, [budgets, isModalOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.category || !form.amount) {
            addToast('Preencha todos os campos', 'warning');
            return;
        }

        try {
            // Parse "1.234,56" -> 1234.56
            const rawAmount = parseFloat(form.amount.replace(/\./g, '').replace(',', '.'));

            if (isNaN(rawAmount) || rawAmount <= 0) {
                addToast('Valor inválido', 'warning');
                return;
            }

            await api.post('/budgets', {
                category: form.category,
                amount: rawAmount
            });
            addToast('Orçamento salvo com sucesso!', 'success');
            setForm({ category: '', amount: '' });
            setIsModalOpen(false);
            fetchBudgets(); // Refresh to ensure calculation is correct
        } catch (error) {
            console.error('Erro ao salvar:', error);
            addToast('Erro ao salvar orçamento', 'error');
        }
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-rose-500';
        if (percentage >= 80) return 'bg-amber-400';
        return 'bg-emerald-500';
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Orçamentos</h2>
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                        <i data-lucide="target" className="w-4 h-4 text-indigo-500"></i>
                        Defina limites e controle seus gastos mensais
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                >
                    <i data-lucide="plus" className="w-4 h-4"></i>
                    Definir Teto
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-400">Carregando orçamentos...</div>
            ) : budgets.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="piggy-bank" className="w-8 h-8 text-slate-300"></i>
                    </div>
                    <h3 className="text-slate-900 font-bold mb-1">Nenhum orçamento definido</h3>
                    <p className="text-slate-500 text-sm">Crie um teto de gastos para começar a economizar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {budgets.map((budget) => (
                        <div key={budget.category} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-700 text-lg">{budget.category}</h3>
                                    <p className="text-xs text-slate-400 font-medium mt-1">
                                        Gasto: <span className={`text-slate-600 font-bold ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                            {isPrivacyEnabled ? 'R$ •••' : `R$ ${budget.spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                        </span>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Teto</p>
                                    <p className={`text-lg font-black text-indigo-600 ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                        {isPrivacyEnabled ? 'R$ •••' : `R$ ${budget.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                                    </p>
                                </div>
                            </div>

                            <div className="relative h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`absolute top-0 left-0 h-full ${getProgressColor(budget.percentage)} transition-all duration-1000 ease-out`}
                                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between mt-2">
                                <span className={`text-[10px] font-bold ${budget.isOverBudget ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {budget.isOverBudget ? 'Orçamento Estourado!' : 'Dentro do limite'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                    {budget.percentage.toFixed(1)}% usado
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Novo Orçamento</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                <i data-lucide="x" className="w-4 h-4 text-slate-500"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Categoria</label>
                                <select
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value })}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">Selecione...</option>
                                    {existingCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Teto Mensal (R$)</label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">R$</span>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={form.amount}
                                        onChange={(e) => {
                                            const digits = e.target.value.replace(/\D/g, '');
                                            if (!digits) {
                                                setForm({ ...form, amount: '' });
                                                return;
                                            }
                                            const amount = parseInt(digits) / 100;
                                            const formatted = amount.toLocaleString('pt-BR', {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            });
                                            setForm({ ...form, amount: formatted });
                                        }}
                                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 text-lg"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl mt-4 transition-all active:scale-95 shadow-xl shadow-indigo-200">
                                Salvar Orçamento
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
