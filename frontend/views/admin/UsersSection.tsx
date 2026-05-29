import React from 'react';
import {
  Users, Receipt, CreditCard, BarChart3, Target, Bot, MessagesSquare,
  Clock, Eye, ChevronDown, ChevronUp, CheckCircle, AlertTriangle,
  Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import type { AdminLogic } from './useAdminLogic';
import { formatDate } from './utils';

export const UsersSection: React.FC<{ logic: AdminLogic }> = ({ logic }) => {
  const {
    users, locale, planCounts,
    userSearch, setUserSearch,
    userPlanFilter, setUserPlanFilter,
    userStatusFilter, setUserStatusFilter,
    userSort, setUserSort,
    userPage, setUserPage,
    filteredUsers, paginatedUsers, userTotalPages,
    expandedUser, setExpandedUser,
    planEditing, setPlanEditing, planForm, setPlanForm,
    isSavingPlan, handleSavePlan, handleDeleteUser,
  } = logic;

  return (
    <div className="space-y-4">
      {/* Search + Filters bar */}
      <div className="bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-4 shadow-lg shadow-slate-100/50 dark:shadow-none space-y-3">
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

        <div className="flex flex-wrap gap-2">
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
                      {((user.name || user.email || '?')[0]).toUpperCase()}
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
                          <button onClick={() => setPlanEditing(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">
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
                              <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">Duração</label>
                              <select
                                value={planForm.duration}
                                onChange={e => setPlanForm({ ...planForm, duration: e.target.value })}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                              >
                                <option value="lifetime">Vitalício</option>
                                <option value="30d">30 dias</option>
                                <option value="60d">60 dias</option>
                                <option value="90d">90 dias</option>
                                <option value="6m">6 meses</option>
                                <option value="12m">12 meses</option>
                                <option value="custom">Manter expiração atual</option>
                              </select>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSavePlan(user.id)}
                            disabled={isSavingPlan || planForm.plan === 'free' && planForm.duration !== 'lifetime'}
                            className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSavingPlan ? 'Salvando...' : 'Salvar Alteração'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Delete User (non-admin only) */}
                    {!user.isAdmin && (
                      <button
                        onClick={() => {
                          if (confirm(`Excluir usuário ${user.name || user.email} e todos os seus dados? Esta ação é irreversível.`)) {
                            handleDeleteUser(user.id);
                          }
                        }}
                        className="flex items-center gap-2 mt-4 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Excluir Usuário
                      </button>
                    )}
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
  );
};