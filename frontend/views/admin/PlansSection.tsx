import React from 'react';
import { Clock, CreditCard } from 'lucide-react';
import type { AdminLogic } from './useAdminLogic';

export const PlansSection: React.FC<{ logic: AdminLogic }> = ({ logic }) => {
  const { planStats } = logic;
  if (!planStats) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Free', value: planStats.plans.free, color: 'bg-slate-100 dark:bg-slate-700', textColor: 'text-slate-600 dark:text-slate-300' },
          { label: 'Premium', value: planStats.plans.premium, color: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Vitalicio', value: planStats.lifetimeUsers, color: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400' },
        ].map(card => (
          <div key={card.label} className={`${card.color} border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 text-center`}>
            <p className={`text-2xl font-black ${card.textColor}`}>{card.value}</p>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Expirando em 7 dias</h3>
        </div>
        {planStats.expiringSoon.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum plano expirando em breve.</p>
        ) : (
          <div className="space-y-2">
            {planStats.expiringSoon.map(sub => (
              <div key={sub.userId} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{sub.user.name || sub.user.email}</p>
                  <p className="text-[10px] text-slate-400">{sub.user.email}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-[9px] font-black rounded-lg ${
                    sub.plan === 'premium' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>{sub.plan.toUpperCase()}</span>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                    Expira: {new Date(sub.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Para alterar o plano de um usuario, va para a aba <strong>Usuarios</strong>, expanda o usuario e clique em <strong>Alterar Plano</strong>.
        </p>
      </div>
    </div>
  );
};