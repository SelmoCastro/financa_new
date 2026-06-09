/**
 * Seção visual especializada de uma tela maior; isola uma parte importante da interface para manter o fluxo mais legível.
 */
import React, { useState, useEffect } from 'react';
import { Database, Activity, Clock, Users, HardDrive, Server, RefreshCw } from 'lucide-react';
import type { AdminLogic } from './useAdminLogic';
import { formatBytes, formatUptime } from './utils';
import api from '../../services/api';

export const HealthSection: React.FC<{ logic: AdminLogic }> = ({ logic }) => {
  const { stats, health } = logic;
  const [version, setVersion] = useState<string>('...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    api.get('/app/version').then(res => setVersion(res.data.version || res.data || '...')).catch(() => setVersion('—'));
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await logic.loadAll();
    try {
      const res = await api.get('/app/version');
      setVersion(res.data.version || res.data || '...');
    } catch { /* ignore */ }
    setIsRefreshing(false);
  };

  if (!stats || !health) return null;

  return (
    <div className="space-y-4">
      {/* Version & Refresh */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 shadow-lg shadow-slate-100/50 dark:shadow-none">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 rounded-xl text-sm font-black font-mono">
            v{version}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">Finanza API</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Backend & Banco de Dados</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PostgreSQL</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{health.database.status === 'up' ? '✓ Online' : '✗ Offline'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Conexões ativas</span>
              <span className="font-black text-slate-800 dark:text-white">{health.database.activeConnections}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Uptime</span>
              <span className="font-black text-slate-800 dark:text-white">{formatUptime(health.database.uptimeSeconds)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> Ativos 30d</span>
              <span className="font-black text-slate-800 dark:text-white">{health.database.activeUsers30d}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Armazenamento</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400">{formatBytes(stats.dbSizeBytes)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500">Total de registros</span>
              <span className="font-black text-slate-800 dark:text-white">
                {(
                  stats.transactions + stats.accounts + stats.budgets + stats.goals +
                  stats.categories + stats.creditCards + stats.feedbacks + stats.aiRequests +
                  stats.notifications + stats.invites + stats.users.total
                ).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500">Usuários verificados</span>
              <span className="font-black text-slate-800 dark:text-white">{stats.users.verified} / {stats.users.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick VPS commands reference */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Referência Rápida VPS</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
          {[
            { label: 'Status PM2', cmd: 'pm2 status' },
            { label: 'Logs API', cmd: 'pm2 logs finanza-api --lines 50' },
            { label: 'Restart API', cmd: 'pm2 restart finanza-api' },
            { label: 'Nginx reload', cmd: 'systemctl reload nginx' },
            { label: 'Nginx errors', cmd: 'tail -50 /var/log/nginx/error.log' },
            { label: 'Deploy', cmd: 'cd /opt/finanza && bash deploy.sh all' },
            { label: 'DB shell', cmd: 'docker exec -it finanza-postgres psql -U finanza' },
            { label: 'Disk usage', cmd: 'df -h /' },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
              <span className="text-slate-500 dark:text-slate-400 font-sans font-bold text-[10px] uppercase tracking-wider">{item.label}</span>
              <code className="text-cyan-600 dark:text-cyan-400 text-[11px]">{item.cmd}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};