/**
 * Tela principal do frontend para Admin; reúne estado visual, ações do usuário e composição de componentes.
 */
import React from 'react';
import {
  BarChart3,
  Users,
  CreditCard,
  Activity,
  Server,
  Shield,
  RefreshCw,
  Store,
} from 'lucide-react';
import { useAdminLogic } from './useAdminLogic';
import { OverviewSection } from './OverviewSection';
import { UsersSection } from './UsersSection';
import { PlansSection } from './PlansSection';
import { ActivitySection } from './ActivitySection';
import { HealthSection } from './HealthSection';
import { ResellersSection } from './ResellersSection';
import type { Tab } from './types';

const sections: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Visão Geral', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" /> },
  { id: 'plans', label: 'Planos', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'resellers', label: 'Revendedores', icon: <Store className="w-4 h-4" /> },
  { id: 'activity', label: 'Atividade', icon: <Activity className="w-4 h-4" /> },
  { id: 'health', label: 'Sistema', icon: <Server className="w-4 h-4" /> },
];

export const AdminPanelView: React.FC = () => {
  const logic = useAdminLogic();

  if (logic.isLoading || !logic.stats) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-2xl w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Painel Admin</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Controle total do sistema Finanza
            </p>
          </div>
        </div>
        <button
          onClick={logic.loadAll}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => logic.setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              logic.activeSection === s.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-200 dark:shadow-none'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-600'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {logic.activeSection === 'overview' && <OverviewSection logic={logic} />}
      {logic.activeSection === 'users' && <UsersSection logic={logic} />}
      {logic.activeSection === 'plans' && <PlansSection logic={logic} />}
      {logic.activeSection === 'resellers' && <ResellersSection logic={logic} />}
      {logic.activeSection === 'activity' && <ActivitySection logic={logic} />}
      {logic.activeSection === 'health' && <HealthSection logic={logic} />}
    </div>
  );
};
