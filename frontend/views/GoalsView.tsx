import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

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

    // Form State
    const [form, setForm] = useState({
        title: '',
        targetAmount: '',
        currentAmount: '',
        deadline: ''
    });

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

    useEffect(() => {
        // @ts-ignore
        if (window.lucide) {
            // @ts-ignore
            window.lucide.createIcons();
        }
    }, [goals]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const target = parseFloat(form.targetAmount.replace(/\./g, '').replace(',', '.'));
        const current = form.currentAmount ? parseFloat(form.currentAmount.replace(/\./g, '').replace(',', '.')) : 0;

        if (!form.title || isNaN(target) || target <= 0) {
            addToast('Preencha os campos obrigatórios.', 'warning');
            return;
        }

        try {
            await api.post('/goals', {
                title: form.title,
                targetAmount: target,
                currentAmount: current,
                deadline: form.deadline || undefined
            });
            addToast('Meta criada com sucesso! 🚀', 'success');
            setForm({ title: '', targetAmount: '', currentAmount: '', deadline: '' });
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
            addToast('Valor inválido.', 'warning');
            return;
        }

        try {
            const newAmount = goal.currentAmount + amount;
            await api.patch(`/goals/${goal.id}`, { currentAmount: newAmount });
            addToast(`R$ ${amount} guardados!`, 'success');
            fetchGoals();
        } catch (error) {
            console.error(error);
            addToast('Erro ao depositar.', 'error');
        }
    };

    const formatCurrency = (val: number | string) => {
        if (typeof val === 'string') return val;
        return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const formatInputCurrency = (value: string) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) return '';
        const amount = parseInt(digits) / 100;
        return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            addToast('Valor inválido.', 'warning');
            return;
        }

        try {
            const newAmount = selectedGoal.currentAmount + amount;
            await api.patch(`/goals/${selectedGoal.id}`, { currentAmount: newAmount });
            addToast(`R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} guardados!`, 'success');
            setDepositModalOpen(false);
            fetchGoals();
        } catch (error) {
            console.error(error);
            addToast('Erro ao depositar.', 'error');
        }
    };

    useEffect(() => {
        // @ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }, [goals, depositModalOpen]); // Refresh icons when deposit modal opens too

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Cofres & Metas</h2>
                    <p className="text-slate-500 font-medium">Visualize e conquiste seus sonhos.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                >
                    <i data-lucide="plus-circle" className="w-5 h-5"></i>
                    Nova Meta
                </button>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse"></div>
                    ))}
                </div>
            ) : goals.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="target" className="w-8 h-8 text-slate-300"></i>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhuma meta ainda</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">Crie seu primeiro cofrinho para começar a juntar dinheiro para seus sonhos!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map(goal => {
                        const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                        const isComplete = progress >= 100;

                        return (
                            <div key={goal.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                                {isComplete && (
                                    <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl">
                                        Concluído
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                                        <i data-lucide="target" className="w-6 h-6"></i>
                                    </div>
                                    <button onClick={() => openDepositModal(goal)} className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors active:scale-90" title="Adicionar dinheiro">
                                        <i data-lucide="plus" className="w-6 h-6"></i>
                                    </button>
                                </div>

                                <h3 className="text-lg font-bold text-slate-800 mb-1">{goal.title}</h3>
                                <p className={`text-xs text-slate-400 font-bold uppercase mb-4 ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
                                    Meta: {isPrivacyEnabled ? 'R$ •••' : formatCurrency(goal.targetAmount)}
                                </p>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <span className={`text-2xl font-black text-slate-800 ${isPrivacyEnabled ? 'blur-md select-none' : ''}`}>
                                            {isPrivacyEnabled ? 'R$ •••' : formatCurrency(goal.currentAmount)}
                                        </span>
                                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${isComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                                            {progress.toFixed(0)}%
                                        </span>
                                    </div>

                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${isComplete ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>

                                    {goal.deadline && (
                                        <p className="text-[10px] text-slate-400 text-center font-medium">
                                            Prazo: {new Date(goal.deadline).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Goal Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-800">Novo Objetivo</h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                <i data-lucide="x" className="w-5 h-5 text-slate-500"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome da Meta</label>
                                <input
                                    autoFocus
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Ex: Viagem Disney, Carro Novo..."
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Valor Alvo (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">R$</span>
                                        <input
                                            className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="0,00"
                                            value={form.targetAmount}
                                            onChange={e => setForm({ ...form, targetAmount: formatInputCurrency(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Já tenho (R$)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs pointer-events-none">R$</span>
                                        <input
                                            className="w-full pl-10 pr-4 py-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="0,00"
                                            value={form.currentAmount}
                                            onChange={e => setForm({ ...form, currentAmount: formatInputCurrency(e.target.value) })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prazo (Opcional)</label>
                                <input
                                    type="date"
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={form.deadline}
                                    onChange={e => setForm({ ...form, deadline: e.target.value })}
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    className="w-full py-4 rounded-2xl font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                >
                                    Criar Meta
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Deposit Modal */}
            {depositModalOpen && selectedGoal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-800">Novo Aporte</h2>
                                <p className="text-xs text-slate-500 font-medium mt-1">{selectedGoal.title}</p>
                            </div>
                            <button onClick={() => setDepositModalOpen(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                <i data-lucide="x" className="w-5 h-5 text-slate-500"></i>
                            </button>
                        </div>

                        <form onSubmit={confirmDeposit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Quanto quer guardar?</label>
                                <div className="relative">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xl pointer-events-none">R$</span>
                                    <input
                                        autoFocus
                                        className="w-full pl-14 pr-6 py-6 bg-slate-50 border-none rounded-3xl font-black text-3xl text-slate-800 focus:ring-4 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300"
                                        placeholder="0,00"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(formatInputCurrency(e.target.value))}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full py-4 rounded-2xl font-black text-white bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-200 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <i data-lucide="piggy-bank" className="w-5 h-5"></i>
                                Guardar Dinheiro
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
