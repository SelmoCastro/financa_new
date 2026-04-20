import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  BarChart3, Users, Database, Server, Activity, CreditCard,
  Target, Receipt, Tag, MessagesSquare, Bot, Bell, UserPlus,
  HardDrive, Clock, Shield, ChevronDown, ChevronUp, RefreshCw,
  TrendingUp, Zap, Eye, Trash2, AlertTriangle, CheckCircle
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
  _count: {
    transactions: number;
    accounts: number;
    budgets: number;
    goals: number;
    aiRequestLogs: number;
    feedbacks: number;
  };
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

type Tab = 'overview' | 'users' | 'activity' | 'health';

export const AdminPanelView: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Tab>('overview');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const { addToast } = useToast();
  const { locale } = useCurrency();

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, activityRes, healthRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/activity'),
        api.get('/admin/health'),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setActivity(activityRes.data);
      setHealth(healthRes.data);
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
    { id: 'activity', label: 'Atividade', icon: <Activity className="w-4 h-4" /> },
    { id: 'health', label: 'Sistema', icon: <Server className="w-4 h-4" /> },
  ];

  const statCards = [
    { label: 'Usuários', value: stats.users.total, sub: `${stats.users.verified} verificados`, icon: <Users className="w-5 h-5" />, color: 'bg-blue-500' },
    { label: 'Transações', value: stats.transactions, icon: <Receipt className="w-5 h-5" />, color: 'bg-emerald-500' },
    { label: 'Contas', value: stats.accounts, icon: <CreditCard className="w-5 h-5" />, color: 'bg-purple-500' },
    { label: 'Orçamentos', value: stats.budgets, icon: <BarChart3 className="w-5 h-5" />, color: 'bg-amber-500' },
    { label: 'Metas', value: stats.goals, icon: <Target className="w-5 h-5" />, color: 'bg-pink-500' },
    { label: 'Categorias', value: stats.categories, icon: <Tag className="w-5 h-5" />, color: 'bg-cyan-500' },
    { label: 'Req. IA', value: stats.aiRequests, icon: <Bot className="w-5 h-5" />, color: 'bg-violet-500' },
    { label: 'Feedbacks', value: stats.feedbacks, icon: <MessagesSquare className="w-5 h-5" />, color: 'bg-orange-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">Painel Admin</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Controle total do sistema Finanza</p>
          </div>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
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
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
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
                  <div className="text-center p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl">
                    <p className="text-2xl font-black text-violet-600 dark:text-violet-400">{activity.last30Days.aiRequestCount}</p>
                    <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Req. IA</p>
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
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
              {users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-3">
            {users.map(user => (
              <div key={user.id} className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-lg shadow-slate-100/50 dark:shadow-none">
                <button
                  onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm">
                      {(user.name || user.email)[0].toUpperCase()}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{user.name || 'Sem nome'}</p>
                        {user.isAdmin && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[9px] font-black uppercase rounded-md tracking-wider">Admin</span>
                        )}
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVITY */}
      {activeSection === 'activity' && activity && (
        <div className="space-y-6">
          {/* Top AI Users */}
          <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-lg shadow-slate-100/50 dark:shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">Top Usuarios IA (30d)</h3>
            </div>
            {activity.topAiUsers.length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma requisicao IA nos ultimos 30 dias.</p>
            ) : (
              <div className="space-y-2">
                {activity.topAiUsers.map((u, i) => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-black">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">{u.name || u.email}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-lg text-xs font-black">
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
                  <code className="text-indigo-600 dark:text-indigo-400 text-[11px]">{item.cmd}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};