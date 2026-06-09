/**
 * Seção visual especializada de uma tela maior; isola uma parte importante da interface para manter o fluxo mais legível.
 */
import React from 'react';
import {
  BarChart3, Users, Database, Receipt, Landmark,
  Target, Tag, MessagesSquare, Bot, CreditCard, Bell, UserPlus, Zap
} from 'lucide-react';
import type { AdminLogic } from './useAdminLogic';
import { formatBytes } from './utils';

export const OverviewSection: React.FC<{ logic: AdminLogic }> = ({ logic }) => {
  const { stats, activity } = logic;
  if (!stats) return null;

  const statCards = [
    { label: 'Usuários', value: stats.users.total, sub: `${stats.users.verified} verificados`, icon: <Users className="w-5 h-5" />, color: 'bg-blue-500' },
    { label: 'Transações', value: stats.transactions, icon: <Receipt className="w-5 h-5" />, color: 'bg-emerald-500' },
    { label: 'Contas bancárias', value: stats.accounts, icon: <Landmark className="w-5 h-5" />, color: 'bg-violet-500' },
    { label: 'Orçamentos', value: stats.budgets, icon: <BarChart3 className="w-5 h-5" />, color: 'bg-amber-500' },
    { label: 'Metas', value: stats.goals, icon: <Target className="w-5 h-5" />, color: 'bg-pink-500' },
    { label: 'Categorias', value: stats.categories, icon: <Tag className="w-5 h-5" />, color: 'bg-cyan-500' },
    { label: 'Pedidos IA', value: stats.aiRequests, icon: <Bot className="w-5 h-5" />, color: 'bg-indigo-500' },
    { label: 'Feedbacks', value: stats.feedbacks, icon: <MessagesSquare className="w-5 h-5" />, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(card => (
          <div key={card.label} className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 shadow-lg shadow-slate-100/50 dark:shadow-none hover:shadow-xl hover:scale-[1.02] transition-all duration-200">
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
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl"><Database className="w-5 h-5" /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Banco de Dados</p>
              <p className="text-lg font-black text-slate-800 dark:text-white">{formatBytes(stats.dbSizeBytes)}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
              <CreditCard className="w-3 h-3 text-violet-400 mx-auto mb-1" />
              <p className="text-xs font-black text-slate-800 dark:text-white">{stats.creditCards}</p>
              <p className="text-[8px] text-slate-400 uppercase tracking-wider">Cartões</p>
            </div>
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
              <Bell className="w-3 h-3 text-amber-400 mx-auto mb-1" />
              <p className="text-xs font-black text-slate-800 dark:text-white">{stats.notifications}</p>
              <p className="text-[8px] text-slate-400 uppercase tracking-wider">Notific.</p>
            </div>
            <div className="text-center p-2 bg-slate-50 dark:bg-slate-700/30 rounded-lg">
              <UserPlus className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs font-black text-slate-800 dark:text-white">{stats.invites}</p>
              <p className="text-[8px] text-slate-400 uppercase tracking-wider">Convites</p>
            </div>
          </div>
        </div>

        {activity && (
          <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none md:col-span-2">
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Últimos 30 dias</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <UserPlus className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{activity.last30Days.newUsers}</p>
                <p className="text-[10px] font-bold text-blue-400 dark:text-blue-300 uppercase tracking-wider mt-1">Novos Usuários</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <Receipt className="w-5 h-5 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activity.last30Days.newTransactions}</p>
                <p className="text-[10px] font-bold text-emerald-400 dark:text-emerald-300 uppercase tracking-wider mt-1">Transações</p>
              </div>
              <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                <Zap className="w-5 h-5 text-indigo-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{activity.last30Days.aiRequestCount}</p>
                <p className="text-[10px] font-bold text-indigo-400 dark:text-indigo-300 uppercase tracking-wider mt-1">Pedidos IA</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};