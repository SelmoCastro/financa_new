import React from 'react';
import { Zap, MessagesSquare } from 'lucide-react';
import type { AdminLogic } from './useAdminLogic';
import { formatDate } from './utils';

export const ActivitySection: React.FC<{ logic: AdminLogic }> = ({ logic }) => {
  const { activity, locale } = logic;
  if (!activity) return null;

  return (
    <div className="space-y-6">
      {/* Top AI Users */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Top Usuarios IA (30d)</h3>
        </div>
        {activity.topAiUsers.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma requisicao IA nos ultimos 30 dias.</p>
        ) : (
          <div className="space-y-2">
            {activity.topAiUsers.map((u, i) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">{u.name || u.email}</p>
                    <p className="text-[10px] text-slate-400">{u.email}</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg text-xs font-black">
                  {u.requestCount} req
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Feedbacks */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
        <div className="flex items-center gap-2 mb-4">
          <MessagesSquare className="w-5 h-5 text-orange-500" />
          <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Feedbacks Recentes (30d)</h3>
        </div>
        {activity.recentFeedbacks.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum feedback nos ultimos 30 dias.</p>
        ) : (
          <div className="space-y-2">
            {activity.recentFeedbacks.map(fb => (
              <div key={fb.id} className="p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{fb.user.name || fb.user.email}</p>
                  <span className="text-[9px] text-slate-400">{formatDate(fb.createdAt, locale)}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{fb.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};