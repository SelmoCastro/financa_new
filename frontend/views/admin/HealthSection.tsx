import React from 'react';
import { Database, Activity, Clock, Users, HardDrive, Server } from 'lucide-react';
import type { AdminLogic } from './useAdminLogic';
import { formatBytes, formatUptime } from './utils';

export const HealthSection: React.FC<{ logic: AdminLogic }> = ({ logic }) => {
  const { stats, health } = logic;
  if (!stats || !health) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">PostgreSQL</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{health.database.status === 'up' ? 'Online' : 'Offline'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><Activity className="w-3 h-3" /> Conexoes ativas</span>
              <span className="font-black text-slate-800 dark:text-white">{health.database.activeConnections}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> Uptime</span>
              <span className="font-black text-slate-800 dark:text-white">{formatUptime(health.database.uptimeSeconds)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1"><Users className="w-3 h-3" /> Users ativos (30d)</span>
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tamanho DB</p>
              <p className="text-lg font-black text-blue-600 dark:text-blue-400">{formatBytes(stats.dbSizeBytes)}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500">Tabelas estimadas</span>
              <span className="font-black text-slate-800 dark:text-white">14+</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 dark:text-slate-500">Total registros</span>
              <span className="font-black text-slate-800 dark:text-white">
                {(
                  stats.transactions + stats.accounts + stats.budgets + stats.goals +
                  stats.categories + stats.creditCards + stats.feedbacks + stats.aiRequests +
                  stats.notifications + stats.invites + stats.users.total
                ).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick VPS commands reference */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Referencia Rapida VPS</h3>
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