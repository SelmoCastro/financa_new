import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useCurrency } from '../../context/CurrencyContext';
import type { Stats, UserRow, PlanStatsData, ActivityData, HealthData, Tab } from './types';

const USERS_PER_PAGE = 10;

export function useAdminLogic() {
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
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'verified' | 'unverified' | 'admin'>('all');
  const [userSort, setUserSort] = useState<'name' | 'newest' | 'oldest' | 'transactions' | 'ai'>('newest');
  const [userPage, setUserPage] = useState(1);
  const { addToast } = useToast();
  const { locale } = useCurrency();

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
        const email = (u.email || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      addToast('Usuário excluído com sucesso.', 'success');
      setExpandedUser(null);
      loadAll();
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Erro ao excluir usuário.', 'error');
    }
  };

  useEffect(() => { loadAll(); }, []);

  return {
    // Data
    stats, users, activity, health, planStats, locale,
    // UI state
    isLoading, activeSection, setActiveSection,
    expandedUser, setExpandedUser,
    planEditing, setPlanEditing, planForm, setPlanForm,
    isSavingPlan, handleSavePlan, loadAll,
    // User filters
    userSearch, setUserSearch,
    userPlanFilter, setUserPlanFilter,
    userStatusFilter, setUserStatusFilter,
    userSort, setUserSort,
    userPage, setUserPage,
    filteredUsers, paginatedUsers, userTotalPages, planCounts,
    USERS_PER_PAGE,
    handleDeleteUser,
  };
}

export type AdminLogic = ReturnType<typeof useAdminLogic>;