import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataProvider';
import { useMonth } from '../context/MonthContext';
import { useCurrency } from '../context/CurrencyContext';
import { Category } from '../types';

interface Budget {
    id: string;
    amount: number;
    categoryId: string;
    categoryObj: { id: string; name: string; icon: string; color?: string };
    spent: number;
    percentage: number;
    isOverBudget: boolean;
}

interface BudgetsViewProps {
    isPrivacyEnabled: boolean;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({ isPrivacyEnabled }) => {
    const { categories } = useData();
    const { selectedDate } = useMonth();
    const { addToast } = useToast();
    const { formatCurrency, currencySymbol, locale } = useCurrency(); // Component State
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ categoryId: '', amount: '' });
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    
    const fetchBudgets = async () => {
        try {
            const response = await api.get('/budgets', {
                params: {
                    year: selectedDate.getFullYear(),
                    month: selectedDate.getMonth()
                }
            });
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
    }, [selectedDate]);

    useEffect(() => {
        // @ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }, [budgets, isModalOpen]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.categoryId || !form.amount) {
            addToast('Preencha todos os campos', 'info');
            return;
        }

        try {
            // Parse "1.234,56" -> 1234.56
            const rawAmount = parseFloat(form.amount.replace(/\./g, '').replace(',', '.'));

            if (isNaN(rawAmount) || rawAmount <= 0) {
                addToast('Valor inválido', 'info');
                return;
            }

            if (editingBudget) {
                await api.patch(`/budgets/${editingBudget.id}`, {
                    categoryId: form.categoryId,
                    amount: rawAmount
                });
                addToast('Orçamento atualizado com sucesso!', 'success');
            } else {
                await api.post('/budgets', {
                    categoryId: form.categoryId,
                    amount: rawAmount
                });
                addToast('Orçamento salvo com sucesso!', 'success');
            }

            setForm({ categoryId: '', amount: '' });
            setEditingBudget(null);
            setIsModalOpen(false);
            fetchBudgets(); // Refresh to ensure calculation is correct
        } catch (error) {
            console.error('Erro ao salvar:', error);
            addToast('Erro ao salvar orçamento', 'error');
        }
    };

    const handleDelete = async (id: string, categoryName: string) => {
        if (!confirm(`Tem certeza que deseja excluir o orçamento de ${categoryName}?`)) return;

        try {
            await api.delete(`/budgets/${id}`);
            addToast('Orçamento excluído com sucesso!', 'success');
            fetchBudgets();
        } catch (error) {
            console.error('Erro ao excluir:', error);
            addToast('Erro ao excluir orçamento', 'error');
        }
    };

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-rose-500';
        if (percentage >= 80) return 'bg-amber-400';
        return 'bg-emerald-500';
    };

    const openEditModal = (budget: Budget) => {
        setEditingBudget(budget);
        setForm({
            categoryId: budget.categoryId,
            amount: budget.amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Planejamento</p>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">Orçamentos</h2>
                </div>
                <button
                    onClick={() => {
                        setEditingBudget(null);
                        setForm({ categoryId: '', amount: '' });
                        setIsModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 transition-all active:scale-95 flex items-center gap-2"
                >
                    <i data-lucide="plus" className="w-4 h-4"></i>
                    Definir Teto
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando orçamentos...</div>
            ) : budgets.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-[2.5rem] border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
                        <i data-lucide="piggy-bank" className="w-10 h-10 text-slate-300 dark:text-slate-600"></i>
                    </div>
                    <h3 className="text-slate-900 dark:text-white font-black text-xl mb-2">Nenhum orçamento definido</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xs mx-auto">Crie um teto de gastos para cada categoria e comece a economizar de verdade.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {budgets.map((budget) => (
                        <div key={budget.categoryId} className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <div className="space-y-1">
                                    <h3 className="font-black text-slate-800 dark:text-white text-xl tracking-tight">{budget.categoryObj?.name || 'Categoria'}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Gasto Atual</span>
                                        <span className={`text-sm font-black ${budget.isOverBudget ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'} ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                            {isPrivacyEnabled ? '••••' : formatCurrency(budget.spent)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-3">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(budget)}
                                            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-all"
                                            title="Editar Orçamento"
                                        >
                                            <i data-lucide="edit-3" className="w-4 h-4"></i>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(budget.id, budget.categoryObj?.name || 'Categoria')}
                                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all"
                                            title="Excluir Orçamento"
                                        >
                                            <i data-lucide="trash-2" className="w-4 h-4"></i>
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-0.5">Teto Mensal</p>
                                        <p className={`text-xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                            {isPrivacyEnabled ? '••••' : formatCurrency(budget.amount)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative h-4 w-full bg-slate-100 dark:bg-slate-900/50 rounded-full overflow-hidden p-1">
                                <div
                                    className={`h-full rounded-full ${getProgressColor(budget.percentage)} transition-all duration-1000 ease-out shadow-sm`}
                                    style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between mt-4">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${budget.isOverBudget ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${budget.isOverBudget ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {budget.isOverBudget ? 'Orçamento Estourado!' : 'Dentro do limite'}
                                    </span>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                    {budget.percentage.toFixed(1)}% utilizado
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{editingBudget ? 'Editar Teto' : 'Novo Teto'}</h3>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Planeje seus gastos</p>
                            </div>
                            <button onClick={() => { setIsModalOpen(false); setEditingBudget(null); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
                                <i data-lucide="x" className="w-5 h-5 text-slate-500 dark:text-slate-400"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Categoria do Gasto</label>
                                <div className="relative">
                                    <select
                                        value={form.categoryId}
                                        onChange={e => {
                                            const selectedId = e.target.value;
                                            setForm({ ...form, categoryId: selectedId });
                                        }}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none appearance-none cursor-pointer transition-all"
                                    >
                                        <option value="">Selecione uma categoria...</option>

                                        <optgroup label="Entradas (Rendas)">
                                            {categories.filter(c => c.type === 'INCOME').map(c => (
                                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                                            ))}
                                        </optgroup>

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
                                    </select>
                                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <i data-lucide="chevron-down" className="w-4 h-4"></i>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Limite Mensal Desejado</label>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-black text-lg pointer-events-none group-focus-within:text-indigo-500 transition-colors">{currencySymbol}</span>
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
                                            const formatted = amount.toLocaleString(locale, {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            });
                                            setForm({ ...form, amount: formatted });
                                        }}
                                        className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800 dark:text-white text-2xl tracking-tight"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl mt-4 transition-all active:scale-95 shadow-xl shadow-indigo-600/20">
                                {editingBudget ? 'Atualizar Orçamento' : 'Salvar Orçamento'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
