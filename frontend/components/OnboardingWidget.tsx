import React, { useMemo } from 'react';
import { CheckCircle2, Circle, ArrowRight, Wallet, Target, PiggyBank } from 'lucide-react';
import { useData } from '../context/DataProvider';

export const OnboardingWidget: React.FC = () => {
    const { accounts, transactions, budgets } = useData();

    const steps = useMemo(() => [
        {
            id: 'account',
            title: 'Adicione sua primeira conta',
            description: 'Registre onde seu dinheiro fica guardado.',
            completed: accounts.length > 0,
            icon: <Wallet className="w-5 h-5" />,
        },
        {
            id: 'transaction',
            title: 'Crie um lançamento',
            description: 'Registre uma receita ou despesa recente.',
            completed: transactions.length > 0,
            icon: <ArrowRight className="w-5 h-5" />,
        },
        {
            id: 'budget',
            title: 'Defina um orçamento',
            description: 'Planeje quanto quer gastar por categoria.',
            completed: budgets.length > 0,
            icon: <Target className="w-5 h-5" />,
        },
    ], [accounts.length, transactions.length, budgets.length]);

    const progress = useMemo(() => {
        const completed = steps.filter(s => s.completed).length;
        return (completed / steps.length) * 100;
    }, [steps]);

    if (progress === 100) return null;

    return (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Primeiros Passos</h3>
                    <p className="text-sm text-slate-500">Complete estas tarefas para dominar suas finanças.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-indigo-600">{Math.round(progress)}% completo</span>
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={`p-4 rounded-2xl border transition-all ${step.completed
                                ? 'bg-emerald-50 border-emerald-100 opacity-75'
                                : 'bg-slate-50 border-slate-100'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            <div className={`p-2 rounded-xl ${step.completed ? 'bg-white text-emerald-500' : 'bg-white text-slate-400'}`}>
                                {step.completed ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-sm font-bold truncate ${step.completed ? 'text-emerald-700' : 'text-slate-700'}`}>
                                    {step.title}
                                </h4>
                                <p className={`text-xs mt-0.5 line-clamp-2 ${step.completed ? 'text-emerald-600/70' : 'text-slate-500'}`}>
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
