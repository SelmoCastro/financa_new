import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { toYYYYMMDD } from '../utils/dateUtils';
import { useCurrency } from '../context/CurrencyContext';
import { PlusCircle, Target, Edit3, Trash2, Plus, Calendar, X, Tag, PiggyBank } from 'lucide-react';

interface Goal {
    id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    icon?: string;
    color?: string;
}

interface GoalsViewProps {
    isPrivacyEnabled: boolean;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ isPrivacyEnabled }) => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const { formatCurrency, currencySymbol, locale } = useCurrency();

    // Form State
    const [form, setForm] = useState({
        title: '',
        targetAmount: '',
        currentAmount: '',
        deadline: ''
    });
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

    // Deposit Modal State
    const [depositModalOpen, setDepositModalOpen] = useState(false);
    const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
    const [depositAmount, setDepositAmount] = useState('');

    const fetchGoals = async () => {
        setIsLoading(true);
        try {
            const response = await api.get('/goals');
            setGoals(response.data);
        } catch (error) {
            console.error('Erro ao buscar metas:', error);
            addToast('Erro ao carregar metas.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, []);



    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const target = parseFloat(form.targetAmount.replace(/\./g, '').replace(',', '.'));
        const current = form.currentAmount ? parseFloat(form.currentAmount.replace(/\./g, '').replace(',', '.')) : 0;

        if (!form.title || isNaN(target) || target <= 0) {
            addToast('A data de conclusão não pode estar no passado', 'error');
            return;
        }

        try {
            if (editingGoal) {
                await api.patch(`/goals/${editingGoal.id}`, {
                    title: form.title,
                    targetAmount: target,
                    currentAmount: current,
                    deadline: form.deadline || undefined
                });
                addToast('Meta atualizada com sucesso! 🎯', 'success');
            } else {
                await api.post('/goals', {
                    title: form.title,
                    targetAmount: target,
                    currentAmount: current,
                    deadline: form.deadline || undefined
                });
                addToast('Meta criada com sucesso! 🚀', 'success');
            }
            setForm({ title: '', targetAmount: '', currentAmount: '', deadline: '' });
            setEditingGoal(null);
            setIsModalOpen(false);
            fetchGoals();
        } catch (error: any) {
            console.error('Erro ao salvar meta:', error);
            const msg = error.response?.data?.message
                ? (Array.isArray(error.response.data.message) ? error.response.data.message[0] : error.response.data.message)
                : 'Erro ao criar meta.';
            addToast(msg, 'error');
        }
    };

    const handleDeposit = async (goal: Goal) => {
        const amountStr = prompt('Quanto você quer guardar?');
        if (!amountStr) return;

        const amount = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            addToast('Valor inválido.', 'error');
            return;
        }

        try {
            const newAmount = goal.currentAmount + amount;
            await api.patch(`/goals/${goal.id}`, { currentAmount: newAmount });
            addToast(`${formatCurrency(amount)} guardados!`, 'success');
            fetchGoals();
        } catch (error) {
            console.error(error);
            addToast('Erro ao depositar.', 'error');
        }
    };

    const handleDelete = async (goal: Goal) => {
        if (!confirm(`Tem certeza que deseja excluir sua meta '${goal.title}'? Essa ação não pode ser desfeita.`)) return;

        try {
            await api.delete(`/goals/${goal.id}`);
            addToast('Meta excluída com sucesso!', 'success');
            fetchGoals();
        } catch (error) {
            console.error('Erro ao excluir meta:', error);
            addToast('Erro ao excluir a meta', 'error');
        }
    };

    const formatInputCurrency = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) return '';
        const amount = parseInt(digits) / 100;
        return amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const openEditModal = (goal: Goal) => {
        setEditingGoal(goal);
        setForm({
            title: goal.title,
            targetAmount: goal.targetAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            currentAmount: goal.currentAmount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            deadline: goal.deadline ? toYYYYMMDD(goal.deadline) : ''
        });
        setIsModalOpen(true);
    };

    const openDepositModal = (goal: Goal) => {
        setSelectedGoal(goal);
        setDepositAmount('');
        setDepositModalOpen(true);
    };

    const confirmDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGoal || !depositAmount) return;

        const amount = parseFloat(depositAmount.replace(/\./g, '').replace(',', '.'));

        if (isNaN(amount) || amount <= 0) {
            addToast('Valor inválido.', 'error');
            return;
        }

        try {
            const newAmount = selectedGoal.currentAmount + amount;
            await api.patch(`/goals/${selectedGoal.id}`, { currentAmount: newAmount });
            addToast(`${formatCurrency(amount)} guardados!`, 'success');
            setDepositModalOpen(false);
            fetchGoals();
        } catch (error) {
            console.error(error);
            addToast('Erro ao depositar.', 'error');
        }
    };



    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 px-2">
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] mb-1">Realizações</p>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">Cofres & Metas</h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">Transforme seus sonhos em conquistas reais.</p>
                </div>
                <button
                    onClick={() => {
                        setEditingGoal(null);
                        setForm({ title: '', targetAmount: '', currentAmount: '', deadline: '' });
                        setIsModalOpen(true);
                    }}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-4 rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-cyan-600/20 transition-all active:scale-95 flex items-center gap-3"
                >
                    <PlusCircle className="w-5 h-5" />
                    Nova Meta
                </button>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-72 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] animate-pulse"></div>
                    ))}
                </div>
            ) : goals.length === 0 ? (
                <div className="text-center py-24 glass-card rounded-[3rem] border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <Target className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">Nenhuma meta ainda</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium leading-relaxed">Crie seu primeiro cofrinho para começar a juntar dinheiro para seus sonhos e visualize seu progresso!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                    {goals.map(goal => {
                        const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                        const isComplete = progress >= 100;

                        return (
                            <div key={goal.id} className="glass-card p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] relative overflow-hidden group hover:translate-y-[-6px] transition-all duration-300">
                                {isComplete && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase px-6 py-2 rounded-bl-[1.5rem] shadow-lg shadow-emerald-500/20 tracking-widest z-10 animate-pulse">
                                        Concluído
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-10">
                                    <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-[1.5rem] flex items-center justify-center shadow-sm">
                                        <Target className="w-8 h-8" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex gap-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <button onClick={() => openEditModal(goal)} className="p-2.5 text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm" title="Editar Meta">
                                                <Edit3 className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(goal)} className="p-2.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm" title="Excluir Meta">
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <button onClick={() => openDepositModal(goal)} className="p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl transition-all active:scale-90 shadow-sm border border-emerald-100 dark:border-emerald-500/20" title="Adicionar dinheiro">
                                            <Plus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-8 min-w-0">
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">{goal.title}</h3>
                                    <p className={`text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                        Meta: {isPrivacyEnabled ? '•••' : formatCurrency(goal.targetAmount)}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Acumulado</p>
                                            <span className={`text-3xl font-black text-slate-800 dark:text-white tracking-tighter ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                                {isPrivacyEnabled ? '•••' : formatCurrency(goal.currentAmount)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${isComplete ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'}`}>
                                                {progress.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-900/50 rounded-full overflow-hidden p-1 shadow-inner">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-600 to-cyan-400'}`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>

                                    {goal.deadline && (
                                        <div className="flex items-center justify-center gap-2 pt-2">
                                            <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">
                                                Prazo: {new Date(goal.deadline).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Goal Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md shadow-2xl p-10 animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{editingGoal ? 'Editar Objetivo' : 'Novo Objetivo'}</h2>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Planejamento de Sonhos</p>
                            </div>
                            <button type="button" onClick={() => { setIsModalOpen(false); setEditingGoal(null); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm">
                                <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">O que você quer conquistar?</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors">
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <input
                                        autoFocus
                                        className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
                                        placeholder="Ex: Viagem Disney, Carro Novo..."
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Valor Alvo</label>
                                    <div className="relative group">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs pointer-events-none group-focus-within:text-cyan-500 transition-colors">{currencySymbol}</span>
                                        <input
                                            className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
                                            placeholder="0,00"
                                            value={form.targetAmount}
                                            onChange={e => setForm({ ...form, targetAmount: formatInputCurrency(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Já acumulado</label>
                                    <div className="relative group">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-xs pointer-events-none group-focus-within:text-cyan-500 transition-colors">{currencySymbol}</span>
                                        <input
                                            className="w-full pl-12 pr-4 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
                                            placeholder="0,00"
                                            value={form.currentAmount}
                                            onChange={e => setForm({ ...form, currentAmount: formatInputCurrency(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">Prazo Final (Opcional)</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <input
                                        type="date"
                                        className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-black text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
                                        value={form.deadline}
                                        onChange={e => setForm({ ...form, deadline: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-cyan-600 hover:bg-cyan-700 transition-all shadow-xl shadow-cyan-600/20 active:scale-95"
                                >
                                    {editingGoal ? 'Atualizar Meta' : 'Criar Meta'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deposit Modal */}
            {depositModalOpen && selectedGoal && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md shadow-2xl p-10 animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Novo Aporte</h2>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-1">Meta: {selectedGoal.title}</p>
                            </div>
                            <button onClick={() => setDepositModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
                                <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={confirmDeposit} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">Quanto você quer guardar hoje?</label>
                                <div className="relative group">
                                    <span className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 font-black text-2xl pointer-events-none group-focus-within:text-cyan-500 transition-colors">{currencySymbol}</span>
                                    <input
                                        autoFocus
                                        className="w-full pl-18 pr-8 py-8 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem] font-black text-4xl text-slate-800 dark:text-white focus:ring-8 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 tracking-tighter"
                                        placeholder="0,00"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(formatInputCurrency(e.target.value))}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-6 rounded-[1.5rem] font-black text-xs uppercase tracking-widest text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-3"
                            >
                                <PiggyBank className="w-6 h-6" />
                                Confirmar Depósito
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
