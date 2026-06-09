/**
 * Componente reutilizável do frontend; encapsula uma parte relevante da interface dentro do domínio de componentes reutilizáveis da interface.
 */
import React, { useMemo } from 'react';
import { CheckCircle2, ArrowRight, Wallet, Target, Plus } from 'lucide-react';
import { useData } from '../context/DataProvider';

interface OnboardingWidgetProps {
    onAddAccount?: () => void;
    onAddTransaction?: () => void;
    onAddBudget?: () => void;
}

export const OnboardingWidget: React.FC<OnboardingWidgetProps> = ({ onAddAccount, onAddTransaction, onAddBudget }) => {
    const { accounts, transactions, budgets, isLoading } = useData();

    const steps = useMemo(() => [
        {
            id: 'account',
            title: 'Adicione sua primeira conta',
            description: 'Registre onde seu dinheiro fica guardado.',
            completed: accounts.length > 0,
            icon: <Wallet className="w-5 h-5" />,
            action: onAddAccount,
            actionLabel: 'Criar Conta',
        },
        {
            id: 'transaction',
            title: 'Crie um lançamento',
            description: 'Registre uma receita ou despesa recente.',
            completed: transactions.length > 0,
            icon: <ArrowRight className="w-5 h-5" />,
            action: onAddTransaction,
            actionLabel: 'Novo Lançamento',
        },
        {
            id: 'budget',
            title: 'Defina um orçamento',
            description: 'Planeje quanto quer gastar por categoria.',
            completed: budgets.length > 0,
            icon: <Target className="w-5 h-5" />,
            action: onAddBudget,
            actionLabel: 'Criar Orçamento',
        },
    ], [accounts.length, transactions.length, budgets.length, onAddAccount, onAddTransaction, onAddBudget]);

    const progress = useMemo(() => {
        const completed = steps.filter(s => s.completed).length;
        return (completed / steps.length) * 100;
    }, [steps]);

    if (isLoading) return null;
    if (progress === 100) return null;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 md:p-8 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">Primeiros Passos</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Complete estas tarefas para dominar suas finanças.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{Math.round(progress)}%</span>
                    <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-cyan-500 transition-all duration-500 rounded-full"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={`p-4 md:p-5 rounded-2xl border transition-all ${step.completed
                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-cyan-200 dark:hover:border-cyan-500/30'
                            }`}
                    >
                        <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${step.completed ? 'bg-white dark:bg-slate-900 text-emerald-500' : 'bg-white dark:bg-slate-900 text-slate-400'}`}>
                                {step.completed ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold truncate ${step.completed ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {step.title}
                                </h4>
                                <p className={`text-xs mt-0.5 line-clamp-2 ${step.completed ? 'text-emerald-600/70 dark:text-emerald-400/60' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {step.description}
                                </p>
                            </div>
                        </div>
                        {!step.completed && step.action && (
                            <button
                                onClick={step.action}
                                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-sm shadow-cyan-600/20 transition-all active:scale-95"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                {step.actionLabel}
                            </button>
                        )}
                        {step.completed && (
                            <div className="mt-3 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold text-[10px] uppercase tracking-widest">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Concluído
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};