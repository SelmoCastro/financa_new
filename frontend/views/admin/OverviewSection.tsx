import React from 'react';
import {
  BarChart3, Users, Database, Receipt, CreditCard,
  Target, Tag, MessagesSquare, Bot
} from 'lucide-react';
import type { AdminLogic } from './useAdminLogic';
import { formatBytes } from './utils';

export const OverviewSection: React.FC<{ logic: AdminLogic }> = ({ logic }) => {
  const { stats, activity } = logic;
  if (!stats) return null;

  const statCards = [
    { label: 'Usuários', value: stats.users.total, sub: `${stats.users.verified} verificados`, icon: <Users className="w-5 h-5" />, color: 'bg-blue-500' },
    { label: 'Transações', value: stats.transactions, icon: <Receipt className="w-5 h-5" />, color: 'bg-emerald-500' },
    { label: 'Contas', value: stats.accounts, icon: <CreditCard className="w-5 h-5" />, color: 'bg-blue-500' },
    { label: 'Orçamentos', value: stats.budgets, icon: <BarChart3 className="w-5 h-5" />, color: 'bg-amber-500' },
    { label: 'Metas', value: stats.goals, icon: <Target className="w-5 h-5" />, color: 'bg-pink-500' },
    { label: 'Categorias', value: stats.categories, icon: <Tag className="w-5 h-5" />, color: 'bg-cyan-500' },
    { label: 'Req. IA', value: stats.aiRequests, icon: <Bot className="w-5 h-5" />, color: 'bg-blue-500' },
    { label: 'Feedbacks', value: stats.feedbacks, icon: <MessagesSquare className="w-5 h-5" />, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 shadow-lg shadow-slate-100/50 dark:shadow-none">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 ${card.color} text-white rounded-xl`}>{card.icon}</div>
              <span className="text-2xl font-black text-slate-800 dark:text-white">{card.value.toLocaleString('pt-BR')}</span>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{card.label}</p>
            {card.sub && <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl"><Database className="w-5 h-5" /></div>
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Banco de Dados</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">{formatBytes(stats.dbSizeBytes)}</p>
            </div>
          </div>
          <div className="flex gap-4 text-[10px] font-bold text-slate-400 dark:text-slate-500">
            <span>Cartoes: {stats.creditCards}</span>
            <span>Notific.: {stats.notifications}</span>
            <span>Convites: {stats.invites}</span>
          </div>
        </div>

        {activity && (
          <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none md:col-span-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Ultimos 30 dias</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{activity.last30Days.newUsers}</p>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Novos Users</p>
              </div>
              <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activity.last30Days.newTransactions}</p>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Transactions</p>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{activity.last30Days.aiRequestCount}</p>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Req. IA</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};