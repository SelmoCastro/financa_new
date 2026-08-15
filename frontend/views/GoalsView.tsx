/**
 * Tela principal do frontend para Goals; reúne estado visual, ações do usuário e composição de componentes.
 */
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { toYYYYMMDD } from '../utils/dateUtils';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { ReadOnlyBadge } from '../components/ReadOnlyBadge';
import { useExceeding } from '../context/ExceedingContext';
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
    isLoading?: boolean;
}

export const GoalsView: React.FC<GoalsViewProps> = ({ isPrivacyEnabled, isLoading: isInitialLoading = false }) => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const { addToast } = useToast();
    const { formatCurrency, currencySymbol, locale } = useCurrency();
    const { t } = useLanguage();
    const { isExceeding } = useExceeding();

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
        setLoadError(false);
        try {
            const response = await api.get('/goals');
            setGoals(Array.isArray(response.data) ? response.data : []);
        } catch (error: any) {
            console.error('Error fetching goals:', error);
            setGoals([]);
            setLoadError(true);
            addToast(error.response?.status === 404 ? t('goals.notFound') : t('goals.saveError'), 'error');
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
            addToast(t('goals.saveError'), 'error');
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
                addToast(t('goals.saveSuccess'), 'success');
            } else {
                await api.post('/goals', {
                    title: form.title,
                    targetAmount: target,
                    currentAmount: current,
                    deadline: form.deadline || undefined
                });
                addToast(t('goals.saveSuccess'), 'success');
            }
            setForm({ title: '', targetAmount: '', currentAmount: '', deadline: '' });
            setEditingGoal(null);
            setIsModalOpen(false);
            fetchGoals();
        } catch (error: any) {
            console.error('Error saving goal:', error);
            const message = error.response?.data?.message || '';
            if (error.response?.status === 403 && message.toLowerCase().includes('limit')) {
                addToast(`${message} 🚀`, 'error');
            } else {
                const msg = error.response?.data?.message
                    ? (Array.isArray(error.response.data.message) ? error.response.data.message[0] : error.response.data.message)
                    : t('goals.saveError');
                addToast(msg, 'error');
            }
        }
    };

    const handleDeposit = async (goal: Goal) => {
        const amountStr = prompt(t('goals.depositAmount'));
        if (!amountStr) return;

        const amount = parseFloat(amountStr.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            addToast(t('goals.depositError'), 'error');
            return;
        }

        try {
            const newAmount = goal.currentAmount + amount;
            await api.patch(`/goals/${goal.id}`, { currentAmount: newAmount });
            addToast(t('goals.depositSuccess'), 'success');
            fetchGoals();
        } catch (error) {
            console.error(error);
            addToast(t('goals.depositError'), 'error');
        }
    };

    const handleDelete = async (goal: Goal) => {
        if (!confirm(t('goals.deleteConfirm'))) return;

        try {
            await api.delete(`/goals/${goal.id}`);
            addToast(t('goals.deleteSuccess'), 'success');
            fetchGoals();
        } catch (error) {
            console.error('Error deleting goal:', error);
            addToast(t('goals.deleteError'), 'error');
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
            addToast(t('goals.depositError'), 'error');
            return;
        }

        try {
            const newAmount = selectedGoal.currentAmount + amount;
            await api.patch(`/goals/${selectedGoal.id}`, { currentAmount: newAmount });
            addToast(t('goals.depositSuccess'), 'success');
            setDepositModalOpen(false);
            fetchGoals();
        } catch (error) {
            console.error(error);
            addToast(t('goals.depositError'), 'error');
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 px-2">
                <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] mb-1">{t('common.management')}</p>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight">{t('goals.title')}</h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 font-medium mt-1">{t('goals.noGoalsDesc')}</p>
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
                    {t('goals.newGoal')}
                </button>
            </div>

            {/* Grid */}
            {isLoading || isInitialLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-72 bg-slate-100 dark:bg-slate-900 rounded-[2.5rem] animate-pulse"></div>
                    ))}
                </div>
            ) : loadError ? (
                <div className="text-center py-24 glass-card rounded-[3rem] border-dashed border-rose-200 dark:border-rose-500/20">
                    <div className="w-24 h-24 bg-rose-50 dark:bg-rose-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <Target className="w-12 h-12 text-rose-300 dark:text-rose-400" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">{t('goals.loadError')}</h3>
                </div>
            ) : goals.length === 0 ? (
                <div className="text-center py-24 glass-card rounded-[3rem] border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                        <Target className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-3 tracking-tight">{t('goals.noGoals')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium leading-relaxed">{t('goals.noGoalsDesc')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                    {goals.map(goal => {
                        const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                        const isComplete = progress >= 100;
                        const isReadOnly = isExceeding('goal', goal.id);

                        return (
                            <div key={goal.id} className="glass-card p-4 sm:p-8 md:p-10 rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] relative overflow-hidden group hover:translate-y-[-6px] transition-all duration-300">
                                {isComplete && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase px-6 py-2 rounded-bl-[1.5rem] shadow-lg shadow-emerald-500/20 tracking-widest z-10 animate-pulse">
                                        {t('goals.saved')}
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-10">
                                    <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-[1.5rem] flex items-center justify-center shadow-sm">
                                        <Target className="w-8 h-8" />
                                    </div>
                                    <div className="flex gap-2">
                                        <div className="flex gap-2 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <button onClick={() => openEditModal(goal)} disabled={isReadOnly} className={`p-2.5 text-slate-400 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`} title={t('common.edit')}>
                                                <Edit3 className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(goal)} disabled={isReadOnly} className={`p-2.5 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all shadow-sm ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`} title={t('common.delete')}>
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <button onClick={() => openDepositModal(goal)} disabled={isReadOnly} className={`p-4 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl transition-all active:scale-90 shadow-sm border border-emerald-100 dark:border-emerald-500/20 ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`} title={t('common.deposit')}>
                                            <Plus className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-8 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">{goal.title}</h3>
                                        <ReadOnlyBadge type="goal" id={goal.id} />
                                    </div>
                                    <p className={`text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                        {t('goals.targetAmount')}: {isPrivacyEnabled ? '•••' : formatCurrency(goal.targetAmount)}
                                    </p>
                                </div>

                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{t('goals.currentAmount')}</p>
                                            <span className={`text-3xl font-black text-slate-800 dark:text-white tracking-tighter ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                                {isPrivacyEnabled ? '•••' : formatCurrency(goal.currentAmount)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${isComplete ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'}`}>
                                                {t('goals.progress', { percent: progress.toFixed(0) })}
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
                                                {t('goals.deadline')}: {new Date(goal.deadline).toLocaleDateString()}
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
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{editingGoal ? t('goals.editGoal') : t('goals.newGoal')}</h2>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-1">{t('goals.noGoalsDesc')}</p>
                            </div>
                            <button type="button" onClick={() => { setIsModalOpen(false); setEditingGoal(null); }} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm">
                                <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">{t('goals.goalTitle')}</label>
                                <div className="relative group">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-500 transition-colors">
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <input
                                        autoFocus
                                        className="w-full pl-16 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all"
                                        placeholder={t('goals.goalTitle')}
                                        value={form.title}
                                        onChange={e => setForm({ ...form, title: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">{t('goals.targetAmount')}</label>
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
                                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">{t('goals.currentAmount')}</label>
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
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">{t('goals.deadline')}</label>
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
                                    {editingGoal ? t('common.save') : t('common.create')}
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
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{t('common.deposit')}</h2>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-1">{t('goals.goalTitle')}: {selectedGoal.title}</p>
                            </div>
                            <button onClick={() => setDepositModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95">
                                <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={confirmDeposit} className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">{t('goals.depositAmount')}</label>
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
                                {t('goals.deposit')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
