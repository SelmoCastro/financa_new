/**
 * Arquivo de apoio da camada de views; define tipos, hooks ou utilitários usados pelas telas principais.
 */
import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useCurrency } from '../../context/CurrencyContext';
import type {
  Stats,
  UserRow,
  PlanStatsData,
  ActivityData,
  HealthData,
  Tab,
  ResellerRow,
  ResellerDetailData,
} from './types';

const USERS_PER_PAGE = 10;

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback para ambientes sem randomUUID; continua suficiente para impedir clique duplo acidental.
  return `manual-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useAdminLogic() {
  // Estado central do painel admin: visão geral, usuários, saúde da aplicação e programa de revendedores.
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [planStats, setPlanStats] = useState<PlanStatsData | null>(null);
  const [resellers, setResellers] = useState<ResellerRow[]>([]);
  const [selectedResellerId, setSelectedResellerId] = useState<string | null>(null);
  const [selectedResellerDetail, setSelectedResellerDetail] =
    useState<ResellerDetailData | null>(null);
  const [isLoadingResellerDetail, setIsLoadingResellerDetail] = useState(false);
  const [isSavingReseller, setIsSavingReseller] = useState(false);
  const [planEditing, setPlanEditing] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState<{ plan: string; duration: string }>({
    plan: 'premium',
    duration: 'lifetime',
  });
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Tab>('overview');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState<'all' | 'free' | 'premium'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'all' | 'verified' | 'unverified' | 'admin'
  >('all');
  const [userSort, setUserSort] = useState<
    'name' | 'newest' | 'oldest' | 'transactions' | 'ai'
  >('newest');
  const [userPage, setUserPage] = useState(1);
  const [createResellerForm, setCreateResellerForm] = useState({
    displayName: '',
    email: '',
    password: '',
    companyName: '',
    phone: '',
    notes: '',
  });
  const [resellerCreditForm, setResellerCreditForm] = useState({
    credits: 1,
    reason: 'Crédito Pix confirmado',
    notes: '',
    idempotencyKey: createIdempotencyKey(),
  });

  const { addToast } = useToast();
  const { locale } = useCurrency();

  // Contadores derivados para os cards rápidos da aba de usuários.
  const planCounts = useMemo(
    () => ({
      free: users.filter((u) => (u.subscription?.plan || 'free') === 'free').length,
      premium: users.filter((u) => u.subscription?.plan === 'premium').length,
      verified: users.filter((u) => u.isEmailVerified).length,
      unverified: users.filter((u) => !u.isEmailVerified).length,
      admins: users.filter((u) => u.isAdmin).length,
    }),
    [users],
  );

  // Aplica busca, filtros e ordenação em memória para manter a UI responsiva sem roundtrip a cada clique.
  const filteredUsers = useMemo(() => {
    let list = [...users];
    if (userSearch.trim()) {
      const q = userSearch
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      list = list.filter((u) => {
        const name = (u.name || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const email = (u.email || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        return name.includes(q) || email.includes(q);
      });
    }
    if (userPlanFilter !== 'all') {
      list = list.filter((u) => (u.subscription?.plan || 'free') === userPlanFilter);
    }
    if (userStatusFilter === 'verified') list = list.filter((u) => u.isEmailVerified);
    else if (userStatusFilter === 'unverified') list = list.filter((u) => !u.isEmailVerified);
    else if (userStatusFilter === 'admin') list = list.filter((u) => u.isAdmin);
    if (userSort === 'name') {
      list.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email));
    } else if (userSort === 'newest') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (userSort === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (userSort === 'transactions') {
      list.sort((a, b) => b._count.transactions - a._count.transactions);
    } else if (userSort === 'ai') {
      list.sort((a, b) => b._count.aiRequestLogs - a._count.aiRequestLogs);
    }
    return list;
  }, [users, userSearch, userPlanFilter, userStatusFilter, userSort]);

  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * USERS_PER_PAGE,
    userPage * USERS_PER_PAGE,
  );

  // Resumo agregado usado pela nova seção de revendedores.
  const resellerSummary = useMemo(() => {
    return {
      total: resellers.length,
      active: resellers.filter((item) => item.status === 'active').length,
      suspended: resellers.filter((item) => item.status === 'suspended').length,
      disabled: resellers.filter((item) => item.status === 'disabled').length,
      totalCredits: resellers.reduce((sum, item) => sum + item.currentBalance, 0),
      activations: resellers.reduce(
        (sum, item) => sum + item.premiumActivationsCount,
        0,
      ),
    };
  }, [resellers]);

  const selectReseller = async (resellerId: string) => {
    // Carrega o detalhe sob demanda para evitar payload pesado na listagem principal.
    setSelectedResellerId(resellerId);
    setIsLoadingResellerDetail(true);
    try {
      const res = await api.get(`/admin/resellers/${resellerId}`);
      setSelectedResellerDetail(res.data);
    } catch (error: any) {
      addToast(
        error?.response?.data?.message || 'Erro ao carregar detalhes do revendedor.',
        'error',
      );
    } finally {
      setIsLoadingResellerDetail(false);
    }
  };

  const loadAll = async () => {
    setIsLoading(true);
    try {
      // O painel inteiro carrega em paralelo porque as seções são independentes entre si.
      const [statsRes, usersRes, activityRes, healthRes, plansRes, resellersRes] =
        await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users'),
          api.get('/admin/activity'),
          api.get('/admin/health'),
          api.get('/admin/plans'),
          api.get('/admin/resellers'),
        ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setActivity(activityRes.data);
      setHealth(healthRes.data);
      setPlanStats(plansRes.data);
      setResellers(resellersRes.data);
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

  const refreshResellers = async (resellerId?: string | null) => {
    // Após qualquer mutação, atualizamos listagem e detalhe para manter saldo, extrato e status sincronizados.
    const listRes = await api.get('/admin/resellers');
    setResellers(listRes.data);
    const targetId = resellerId || selectedResellerId;
    if (targetId) {
      const detailRes = await api.get(`/admin/resellers/${targetId}`);
      setSelectedResellerId(targetId);
      setSelectedResellerDetail(detailRes.data);
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

  const handleCreateReseller = async () => {
    setIsSavingReseller(true);
    try {
      const response = await api.post('/admin/resellers', createResellerForm);
      addToast('Revendedor criado com sucesso.', 'success');
      setCreateResellerForm({
        displayName: '',
        email: '',
        password: '',
        companyName: '',
        phone: '',
        notes: '',
      });
      await refreshResellers(response.data?.reseller?.id);
      setActiveSection('resellers');
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Erro ao criar revendedor.', 'error');
    } finally {
      setIsSavingReseller(false);
    }
  };

  const handleAddCredits = async (resellerId: string) => {
    setIsSavingReseller(true);
    try {
      await api.post(`/admin/resellers/${resellerId}/credits`, resellerCreditForm);
      addToast('Créditos adicionados com sucesso.', 'success');
      setResellerCreditForm({
        credits: 1,
        reason: 'Crédito Pix confirmado',
        notes: '',
        idempotencyKey: createIdempotencyKey(),
      });
      await refreshResellers(resellerId);
    } catch (error: any) {
      addToast(error?.response?.data?.message || 'Erro ao adicionar créditos.', 'error');
    } finally {
      setIsSavingReseller(false);
    }
  };

  const handleUpdateResellerStatus = async (
    resellerId: string,
    status: 'active' | 'suspended' | 'disabled',
  ) => {
    setIsSavingReseller(true);
    try {
      await api.patch(`/admin/resellers/${resellerId}/status`, { status });
      addToast('Status do revendedor atualizado.', 'success');
      await refreshResellers(resellerId);
    } catch (error: any) {
      addToast(
        error?.response?.data?.message || 'Erro ao atualizar status do revendedor.',
        'error',
      );
    } finally {
      setIsSavingReseller(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedResellerId && resellers.length > 0 && activeSection === 'resellers') {
      selectReseller(resellers[0].id);
    }
  }, [activeSection, resellers, selectedResellerId]);

  return {
    stats,
    users,
    activity,
    health,
    planStats,
    resellers,
    resellerSummary,
    selectedResellerId,
    selectedResellerDetail,
    locale,
    isLoading,
    isLoadingResellerDetail,
    isSavingReseller,
    activeSection,
    setActiveSection,
    expandedUser,
    setExpandedUser,
    planEditing,
    setPlanEditing,
    planForm,
    setPlanForm,
    isSavingPlan,
    handleSavePlan,
    loadAll,
    userSearch,
    setUserSearch,
    userPlanFilter,
    setUserPlanFilter,
    userStatusFilter,
    setUserStatusFilter,
    userSort,
    setUserSort,
    userPage,
    setUserPage,
    filteredUsers,
    paginatedUsers,
    userTotalPages,
    planCounts,
    USERS_PER_PAGE,
    handleDeleteUser,
    createResellerForm,
    setCreateResellerForm,
    resellerCreditForm,
    setResellerCreditForm,
    selectReseller,
    handleCreateReseller,
    handleAddCredits,
    handleUpdateResellerStatus,
  };
}

export type AdminLogic = ReturnType<typeof useAdminLogic>;
