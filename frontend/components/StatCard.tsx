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
    <div className="group relative bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 rounded-[2rem] pointer-events-none" />
      <div className="relative flex flex-col justify-between h-full space-y-4">
        <div className="flex justify-between items-start">
          <div className={`p-3.5 rounded-2xl ${color} shadow-sm ring-1 ring-black/5`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border ${trendUp ? 'bg-emerald-50/50 text-emerald-600 border-emerald-100' : 'bg-rose-50/50 text-rose-600 border-rose-100'}`}>
              <span>{trendUp ? '↑' : '↓'}</span>
              <span>{trend}</span>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-slate-500 text-sm font-semibold tracking-wide uppercase">{title}</h3>
          <p className={`text-2xl lg:text-3xl font-bold text-slate-900 mt-1 tracking-tight transition-all duration-500 ${!isVisible ? 'blur-md select-none opacity-50' : ''}`}>
            {isVisible ? value : 'R$ ••••••'}
          </p>
        </div>
      </div>
    </div>
  );
};
