import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  isVisible?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp, color, isVisible = true }) => {
  return (
    <div className="group relative glass-card p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 dark:from-white/5 dark:to-transparent rounded-[1.5rem] sm:rounded-[2rem] pointer-events-none" />
      <div className="relative flex flex-col justify-between h-full space-y-4">
        <div className="flex justify-between items-start">
          <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl ${color} shadow-sm ring-1 ring-black/5 dark:ring-white/10`}>
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { className: 'w-4 h-4 sm:w-5 h-5' } as any) : icon}
          </div>
          {trend && (
            <div className={`flex items-center space-x-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-wider border transition-colors ${trendUp 
              ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
              : 'bg-rose-50/50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
              <span>{trendUp ? '↑' : '↓'}</span>
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-slate-500 dark:text-slate-400 text-[9px] sm:text-[11px] font-black tracking-[0.1em] uppercase truncate">{title}</h3>
          <p className={`text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white mt-1 tracking-tight transition-all duration-500 ${!isVisible ? 'blur-md select-none opacity-50' : ''}`}>
            {isVisible ? value : '••••••'}
          </p>
        </div>
      </div>
    </div>
  );
};
