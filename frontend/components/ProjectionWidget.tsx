import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Banknote, CreditCard, Calendar, AlertCircle, Zap } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useData } from '../context/DataProvider';
import { useMonth } from '../context/MonthContext';
import api from '../services/api';
import { Skeleton } from '../components/Skeleton';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProjectionData {
  currentBalance: number;
  upcomingIncome: number;
  upcomingExpenses: number;
  creditCardDebt: number;
  projectedBalance: number;
  days: Array<{ date: string; balance: number; events: string[] }>;
  upcomingItems: Array<{ description: string; amount: number; type: string; dueDay: number }>;
  unpaidInvoices: Array<{ id: string; referenceMonth: number; referenceYear: number; remaining: number; dueDate: string }>;
}

interface ProjectionWidgetProps {
  isPrivacyEnabled: boolean;
}

export const ProjectionWidget: React.FC<ProjectionWidgetProps> = ({ isPrivacyEnabled }) => {
  const { formatCurrency } = useCurrency();
  const { selectedDate } = useMonth();
  const [projection, setProjection] = useState<ProjectionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchProjection = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.get('/transactions/projection');
        setProjection(res.data);
      } catch (err) {
        console.error('Failed to load projection:', err);
        setError('Erro ao carregar projeção');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjection();
  }, []); // Only fetch once on mount (projection is forward-looking)

  const chartData = useMemo(() => {
    if (!projection) return [];
    return projection.days.map((d) => ({
      date: d.date,
      saldo: d.balance,
      eventos: d.events.length,
    }));
  }, [projection]);

  const todayEvents = useMemo(() => {
    if (!projection) return [];
    const today = new Date().toISOString().split('T')[0];
    const day = projection.days.find((d) => d.date === today);
    return day?.events || [];
  }, [projection]);

  const upcomingWithDates = useMemo(() => {
    if (!projection) return [];

    // Group upcoming items by date
    const byDate = new Map<string, typeof projection.upcomingItems>();

    projection.upcomingItems.forEach((item) => {
      const now = new Date();
      const dueDate = new Date(now.getFullYear(), now.getMonth(), item.dueDay);
      if (dueDate < now) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
      const key = dueDate.toISOString().split('T')[0];
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(item);
    });

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(0, 10);
  }, [projection]);

  if (isLoading) {
    return (
      <div className="glass-card p-4 rounded-[2rem]">
        <Skeleton className="h-[200px] rounded-2xl" />
      </div>
    );
  }

  if (error || !projection) {
    return (
      <div className="glass-card p-4 rounded-[2rem]">
        <div className="flex items-center gap-2 text-amber-500 text-sm font-bold p-2">
          <AlertCircle className="w-4 h-4" />
          {error || 'Projeção indisponível'}
        </div>
      </div>
    );
  }

  const ratio = projection.upcomingIncome > 0
    ? (projection.upcomingExpenses / projection.upcomingIncome) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-3 border border-emerald-100 dark:border-emerald-500/20">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">Receitas</p>
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-300">
            {isPrivacyEnabled ? '••••' : formatCurrency(projection.upcomingIncome)}
          </p>
        </div>
        <div className="bg-rose-50 dark:bg-rose-500/10 rounded-2xl p-3 border border-rose-100 dark:border-rose-500/20">
          <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-0.5">Despesas</p>
          <p className="text-sm font-black text-rose-700 dark:text-rose-300">
            {isPrivacyEnabled ? '••••' : formatCurrency(projection.upcomingExpenses)}
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-3 border border-amber-100 dark:border-amber-500/20">
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">Cartão</p>
          <p className="text-sm font-black text-amber-700 dark:text-amber-300">
            {isPrivacyEnabled ? '••••' : formatCurrency(projection.creditCardDebt)}
          </p>
        </div>
        <div className={`rounded-2xl p-3 border ${projection.projectedBalance >= 0 ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-100 dark:border-cyan-500/20' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20'}`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${projection.projectedBalance >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-rose-600 dark:text-rose-400'}`}>Projeção</p>
          <p className={`text-sm font-black ${projection.projectedBalance >= 0 ? 'text-cyan-700 dark:text-cyan-300' : 'text-rose-700 dark:text-rose-300'}`}>
            {isPrivacyEnabled ? '••••' : formatCurrency(projection.projectedBalance)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-4 rounded-[2rem]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-50 dark:bg-cyan-500/10 rounded-lg">
              <Zap className="w-4 h-4 text-cyan-500" />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">Projeção 30 Dias</h3>
          </div>
          <span className={`text-xs font-black px-2 py-1 rounded-lg ${projection.projectedBalance >= 0 ? 'bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20'}`}>
            {projection.projectedBalance >= 0 ? '+' : ''}{isPrivacyEnabled ? '••' : formatCurrency(projection.projectedBalance, { maximumFractionDigits: 0 })}
          </span>
        </div>

        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="projectionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:opacity-5" />
              <XAxis dataKey="date" tick={false} axisLine={false} />
              <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} dx={-5} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', backgroundColor: 'rgba(255,255,255,0.95)' }}
                itemStyle={{ fontWeight: 800, fontSize: '11px' }}
                labelFormatter={(label) => `Dia ${new Date(label).toLocaleDateString('pt-BR')}`}
                formatter={(value: number, name: string) => [name === 'saldo' ? formatCurrency(value) : `${value} evento(s)`, name === 'saldo' ? 'Saldo' : 'Eventos']}
              />
              <Area type="monotone" dataKey="saldo" stroke="#06b6d4" strokeWidth={2} fill="url(#projectionGradient)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming items */}
      {upcomingWithDates.length > 0 && (
        <div className="glass-card p-4 rounded-[2rem]">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Calendar className="w-4 h-4 text-slate-500" />
            </div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white">Próximos Eventos</h3>
          </div>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {upcomingWithDates.map(([date, items]) => (
              <div key={date} className="p-2.5 bg-slate-50 dark:bg-slate-800/30 rounded-xl">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1.5">
                  {new Date(date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                </p>
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-0.5">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate max-w-[160px]">{item.description}</span>
                    <span className={`text-xs font-black ${item.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {item.type === 'INCOME' ? '+' : '-'} {isPrivacyEnabled ? '••••' : formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
