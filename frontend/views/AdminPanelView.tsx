import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  BarChart3, Users, Database, Server, Activity, CreditCard,
  Target, Receipt, Tag, MessagesSquare, Bot, Bell, UserPlus,
  HardDrive, Clock, Shield, ChevronDown, ChevronUp, RefreshCw,
  TrendingUp, Zap, Eye, Trash2, AlertTriangle, CheckCircle,
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface Stats {
  users: { total: number; verified: number };
  transactions: number;
  accounts: number;
  budgets: number;
  goals: number;
  categories: number;
  creditCards: number;
  feedbacks: number;
  aiRequests: number;
  notifications: number;
  invites: number;
  dbSizeBytes: number;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  subscription: {
    plan: string;
    status: string;
    expiresAt: string | null;
  } | null;
  _count: {
    transactions: number;
    accounts: number;
    budgets: number;
    goals: number;
    aiRequestLogs: number;
    feedbacks: number;
  };
}

interface PlanStatsData {
  plans: { free: number; premium: number; total: number };
  lifetimeUsers: number;
  expiringSoon: Array<{
    userId: string;
    plan: string;
    expiresAt: string;
    user: { name: string; email: string };
  }>;
}

interface ActivityData {
  last30Days: {
    newUsers: number;
    newTransactions: number;
    aiRequestCount: number;
  };
  recentFeedbacks: Array<{
    id: string;
    content: string;
    platform: string;
    createdAt: string;
    user: { name: string; email: string };
  }>;
  topAiUsers: Array<{
    id: string;
    name: string;
    email: string;
    requestCount: number;
  }>;
}

interface HealthData {
  database: {
    status: string;
    activeConnections: number;
    uptimeSeconds: number;
    activeUsers30d: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

type Tab = 'overview' | 'users' | 'plans' | 'activity' | 'health';

export const AdminPanelView: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [planStats, setPlanStats] = useState<PlanStatsData | null>(null);
  const [planEditing, setPlanEditing] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<{ plan: string; duration: string }>({ plan: 'premium', duration: 'lifetime' });
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Tab>('overview');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  // User filters
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'admin'>('all');
  const [userSort, setUserSort] = useState<'name' | 'newest' | 'oldest' | 'transactions' | 'ai'>('newest');
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const { addToast } = useToast();
  const { locale } = useCurrency();

  // Computed user lists (top-level hooks, not inside conditionals)
  const planCounts = useMemo(() => ({
    free: users.filter(u => (u.subscription?.plan || 'free') === 'free').length,
    premium: users.filter(u => u.subscription?.plan === 'premium').length,
    verified: users.filter(u => u.isEmailVerified).length,
    unverified: users.filter(u => !u.isEmailVerified).length,
    admins: users.filter(u => u.isAdmin).length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      list = list.filter(u => {
        const name = (u.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const email = u.email.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return name.includes(q) || email.includes(q);
      });
    }
    if (userPlanFilter !== 'all') list = list.filter(u => (u.subscription?.plan || 'free') === userPlanFilter);
    if (userStatusFilter === 'verified') list = list.filter(u => u.isEmailVerified);
    else if (userStatusFilter === 'unverified') list = list.filter(u => !u.isEmailVerified);
    else if (userStatusFilter === 'admin') list = list.filter(u => u.isAdmin);
    if (userSort === 'name') list.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    else if (userSort === 'newest') list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (userSort === 'oldest') list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (userSort === 'transactions') list.sort((a, b) => b._count.transactions - a._count.transactions);
    else if (userSort === 'ai') list.sort((a, b) => b._count.aiRequestLogs - a._count.aiRequestLogs);
    return list;
  }, [users, userSearch, userPlanFilter, userStatusFilter, userSort]);

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, activityRes, healthRes, plansRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/activity'),
        api.get('/admin/health'),
        api.get('/admin/plans'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setActivity(activityRes.data);
      setHealth(healthRes.data);
      setPlanStats(plansRes.data);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        addToast('Acesso restrito a administradores.', 'error');
      } else {
        addToast('Erro ao carregar painel admin.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePlan = async (userId: string) => {
    setIsSavingPlan(true);
    try {
      await api.patch(`/admin/users/${userId}/plan`, {
        plan: planForm.plan,
        duration: planForm.duration,
      });
      addToast('Plano atualizado com sucesso!', 'success');
      setPlanEditing(null);
      loadAll();
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Erro ao alterar plano.', 'error');
    } finally {
      setIsSavingPlan(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  if (isLoading || !stats) {
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

  const sections: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'users', label: 'Usuários', icon: <Users className="w-4 h-4" /> },
    { id: 'plans', label: 'Planos', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'activity', label: 'Atividade', icon: <Activity className="w-4 h-4" /> },
    { id: 'health', label: 'Sistema', icon: <Server className="w-4 h-4" /> },
  ];

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
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Painel Admin</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Controle total do sistema Finanza</p>
          </div>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-600 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              activeSection === s.id
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-200 dark:shadow-none'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-cyan-600'
            }`}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map(card => (
              <div key={card.label} className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 shadow-lg shadow-slate-100/50 dark:shadow-none">
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2 ${card.color} text-white rounded-xl`}>
                    {card.icon}
                  </div>
                  <span className="text-2xl font-black text-slate-800 dark:text-white">
                    {card.value.toLocaleString('pt-BR')}
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {card.label}
                </p>
                {card.sub && (
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{card.sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* DB Size + extras */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
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

            {/* 30-day summary */}
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
      )}

      {/* USERS */}
      {activeSection === 'users' && (
        <div className="space-y-4">
          {/* Search + Filters bar */}
          <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 shadow-lg shadow-slate-100/50 dark:shadow-none space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={userSearch}
                onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                placeholder="Buscar por nome ou email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm font-medium text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500 outline-none"
              />
            </div>

            {/* Filter chips row */}
            <div className="flex flex-wrap gap-2">
              {/* Plan filter chips */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3 h-3 text-slate-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Plano:</span>
              </div>
              {[
                { id: 'all' as const, label: 'Todos', count: users.length },
                { id: 'free' as const, label: 'Free', count: planCounts.free },
                { id: 'premium' as const, label: 'Premium', count: planCounts.premium },
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => { setUserPlanFilter(chip.id); setUserPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    userPlanFilter === chip.id
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {chip.label} <span className="opacity-70">({chip.count})</span>
                </button>
              ))}

              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

              {/* Status filter chips */}
              {[
                { id: 'all' as const, label: 'Todos', count: users.length },
                { id: 'verified' as const, label: 'Verificados', count: planCounts.verified },
                { id: 'unverified' as const, label: 'Nao verificados', count: planCounts.unverified },
                { id: 'admin' as const, label: 'Admins', count: planCounts.admins },
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => { setUserStatusFilter(chip.id); setUserPage(1); }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    userStatusFilter === chip.id
                      ? 'bg-amber-500 text-white shadow-md'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {chip.label} <span className="opacity-70">({chip.count})</span>
                </button>
              ))}
            </div>

            {/* Sort + result count */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {filteredUsers.length} usuario{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                <select
                  value={userSort}
                  onChange={e => setUserSort(e.target.value as typeof userSort)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 outline-none"
                >
                  <option value="newest">Mais recentes</option>
                  <option value="oldest">Mais antigos</option>
                  <option value="name">Nome A-Z</option>
                  <option value="transactions">Mais transacoes</option>
                  <option value="ai">Mais req. IA</option>
                </select>
              </div>
            </div>
          </div>

          {/* User list */}
          <div className="space-y-3">
            {paginatedUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500">Nenhum usuario encontrado</p>
                <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">Tente ajustar os filtros</p>
              </div>
            ) : (
              paginatedUsers.map(user => {
                const userPlan = user.subscription?.plan || 'free';
                const userExpires = user.subscription?.expiresAt;
                const isLifetime = userPlan !== 'free' && !userExpires;

                return (
                <div key={user.id} className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-lg shadow-slate-100/50 dark:shadow-none">
                  <button
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-black text-sm">
                        {(user.name || user.email)[0].toUpperCase()}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{user.name || 'Sem nome'}</p>
                          {user.isAdmin && (
                            <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase rounded-md tracking-wider">Admin</span>
                          )}
                          <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded-md tracking-wider ${
                            userPlan === 'premium' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {userPlan === 'premium' ? 'PREMIUM' : 'FREE'}
                            {isLifetime ? ' (vitalicio)' : userExpires ? ` ate ${new Date(userExpires).toLocaleDateString('pt-BR')}` : ''}
                          </span>
                          {user.isEmailVerified ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                        <span>{user._count.transactions} tx</span>
                        <span className="text-slate-300">|</span>
                        <span>{user._count.accounts} contas</span>
                        <span className="text-slate-300">|</span>
                        <span>{user._count.aiRequestLogs} IA</span>
                      </div>
                      {expandedUser === user.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </button>

                  {expandedUser === user.id && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700/50">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-3">
                        {[
                          { label: 'Transacoes', value: user._count.transactions, icon: <Receipt className="w-3 h-3" /> },
                          { label: 'Contas', value: user._count.accounts, icon: <CreditCard className="w-3 h-3" /> },
                          { label: 'Orcamentos', value: user._count.budgets, icon: <BarChart3 className="w-3 h-3" /> },
                          { label: 'Metas', value: user._count.goals, icon: <Target className="w-3 h-3" /> },
                          { label: 'Req. IA', value: user._count.aiRequestLogs, icon: <Bot className="w-3 h-3" /> },
                          { label: 'Feedbacks', value: user._count.feedbacks, icon: <MessagesSquare className="w-3 h-3" /> },
                        ].map(item => (
                          <div key={item.label} className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1 text-slate-400 dark:text-slate-500 mb-1">
                              {item.icon}
                              <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                            </div>
                            <p className="text-sm font-black text-slate-800 dark:text-white">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400 dark:text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Criado: {formatDate(user.createdAt, locale)}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> Atualizado: {formatDate(user.updatedAt, locale)}</span>
                      </div>

                      {/* Plan Editor */}
                      <div className="mt-4 p-4 bg-cyan-50/50 dark:bg-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-800/30">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-black text-cyan-700 dark:text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" /> Gerenciar Plano
                          </p>
                          {planEditing !== user.id ? (
                            <button
                              onClick={() => {
                                setPlanEditing(user.id);
                                setPlanForm({ plan: userPlan, duration: isLifetime ? 'lifetime' : '30d' });
                              }}
                              className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline"
                            >
                              Alterar Plano
                            </button>
                          ) : (
                            <button
                              onClick={() => setPlanEditing(null)}
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-600"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>

                        {planEditing === user.id && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Plano</label>
                                <select
                                  value={planForm.plan}
                                  onChange={e => setPlanForm({ ...planForm, plan: e.target.value })}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                >
                                  <option value="free">Free</option>
                                  <option value="premium">Premium</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Duracao</label>
                                <select
                                  value={planForm.duration}
                                  onChange={e => setPlanForm({ ...planForm, duration: e.target.value })}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                                >
                                  <option value="lifetime">Vitalicio</option>
                                  <option value="30d">30 dias</option>
                                  <option value="60d">60 dias</option>
                                  <option value="90d">90 dias</option>
                                  <option value="custom">Manter expiracao atual</option>
                                </select>
                              </div>
                            </div>
                            <button
                              onClick={() => handleSavePlan(user.id)}
                              disabled={isSavingPlan || planForm.plan === 'free' && planForm.duration !== 'lifetime'}
                              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSavingPlan ? 'Salvando...' : 'Salvar Alteracao'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {userTotalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-3">
              <button
                onClick={() => setUserPage(p => Math.max(1, p - 1))}
                disabled={userPage === 1}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Anterior
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: userTotalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === userTotalPages || Math.abs(p - userPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`dot-${i}`} className="text-slate-400 text-xs px-1">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setUserPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                          userPage === p
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )
                }
              </div>
              <button
                onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))}
                disabled={userPage === userTotalPages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Proximo <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* PLANS */}
      {activeSection === 'plans' && planStats && (
        <div className="space-y-6">
          {/* Plan distribution */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Free', value: planStats.plans.free, color: 'bg-slate-100 dark:bg-slate-700', textColor: 'text-slate-600 dark:text-slate-300' },
              { label: 'Premium', value: planStats.plans.premium, color: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Vitalicio', value: planStats.lifetimeUsers, color: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400' },
            ].map(card => (
              <div key={card.label} className={`${card.color} border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 text-center`}>
                <p className={`text-2xl font-black ${card.textColor}`}>{card.value}</p>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Expiring soon */}
          <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Expirando em 7 dias</h3>
            </div>
            {planStats.expiringSoon.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum plano expirando em breve.</p>
            ) : (
              <div className="space-y-2">
                {planStats.expiringSoon.map(sub => (
                  <div key={sub.userId} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/30">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{sub.user.name || sub.user.email}</p>
                      <p className="text-[10px] text-slate-400">{sub.user.email}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-[9px] font-black rounded-lg ${
                        sub.plan === 'premium' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>{sub.plan.toUpperCase()}</span>
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-1">
                        Expira: {new Date(sub.expiresAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bulk actions hint */}
          <div className="bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Para alterar o plano de um usuario, va para a aba <strong>Usuarios</strong>, expanda o usuario e clique em <strong>Alterar Plano</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ACTIVITY */}
      {activeSection === 'activity' && activity && (
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
      )}

      {/* HEALTH */}
      {activeSection === 'health' && health && (
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
      )}
    </div>
  );
};