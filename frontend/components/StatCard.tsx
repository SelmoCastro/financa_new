
import React from 'react';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  isVisible?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp, color, isVisible = true }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div>
        <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
        <p className={`text-2xl font-bold text-slate-800 mt-1 transition-all ${!isVisible ? 'blur-md select-none' : ''}`}>
          {isVisible ? value : 'R$ ••••••'}
        </p>
      </div>
    </div>
  );
};
