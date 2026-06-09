/**
 * Tela principal do frontend para ResellerPortal; reúne estado visual, ações do usuário e composição de componentes.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  UserRoundSearch,
} from 'lucide-react';
import resellerApi from '../../services/resellerApi';

const SKU_OPTIONS = [
  { id: 'premium_monthly_credit', label: '1 mês', credits: 1 },
  { id: 'premium_quarterly_credit', label: '3 meses', credits: 3 },
  { id: 'premium_semiannual_credit', label: '6 meses', credits: 6 },
  { id: 'premium_annual_credit', label: '12 meses', credits: 12 },
];

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback aceitável para navegadores antigos; a chave continua trocando a cada tentativa.
  return `portal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const ResellerPortalView: React.FC = () => {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [selectedSku, setSelectedSku] = useState('premium_monthly_credit');
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(createIdempotencyKey());
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadDashboard = async () => {
    // Recarrega saldo, extrato e ativações do próprio revendedor logado.
    setIsLoading(true);
    try {
      const res = await resellerApi.get('/reseller-portal/dashboard');
      setDashboard(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Erro ao carregar o portal.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Mantém o resumo visível do SKU selecionado sem recalcular na renderização inteira.
  const selectedSkuConfig = useMemo(
    () => SKU_OPTIONS.find((item) => item.id === selectedSku) || SKU_OPTIONS[0],
    [selectedSku],
  );

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      // O lookup exige email exato para reduzir o risco de consumir crédito na conta errada.
      const res = await resellerApi.post('/reseller-portal/lookup-user', {
        email: lookupEmail,
      });
      setLookupResult(res.data);
      setConfirmationChecked(false);
    } catch (err: any) {
      setLookupResult(null);
      setError(err?.response?.data?.message || 'Usuário não encontrado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);
    try {
      // A ativação consome crédito com chave idempotente para sobreviver a clique duplo ou retry de rede.
      const res = await resellerApi.post('/reseller-portal/activate-premium', {
        email: lookupEmail,
        sku: selectedSku,
        confirmationChecked,
        idempotencyKey,
      });
      setSuccess(`Premium ativado com sucesso. Novo saldo: ${res.data.currentBalance} crédito(s).`);
      setLookupResult(null);
      setLookupEmail('');
      setConfirmationChecked(false);
      setIdempotencyKey(createIdempotencyKey());
      await loadDashboard();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Falha ao ativar o Premium.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await resellerApi.post('/reseller-portal/auth/logout');
    } finally {
      navigate('/revendedor/login');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 text-slate-900 dark:text-slate-100">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Cabeçalho do portal com ações de atualização e logout. */}
        <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl shadow-slate-200/40 dark:shadow-none md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-cyan-600 p-4 text-white shadow-2xl shadow-cyan-600/30">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Portal Revendedor</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Ativação manual de Premium</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Busca por email exato, preview mascarado e consumo em créditos.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={loadDashboard} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300 hover:border-cyan-300 dark:hover:border-cyan-700">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-slate-700 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-100 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/20 px-4 py-4 text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-4 text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {success}
          </div>
        )}

        {isLoading || !dashboard ? (
          <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Carregando portal...</p>
          </div>
        ) : (
          <>
            {/* Métricas rápidas para o revendedor acompanhar a operação sem entrar em detalhes. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Saldo atual', value: dashboard.currentBalance, hint: 'créditos disponíveis', icon: <CreditCard className="w-5 h-5" />, tone: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300' },
                { label: 'Últimas ativações', value: dashboard.recentActivations?.length || 0, hint: 'registros recentes', icon: <ShieldCheck className="w-5 h-5" />, tone: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300' },
                { label: 'Lançamentos recentes', value: dashboard.recentLedger?.length || 0, hint: dashboard.reseller?.displayName || 'revendedor', icon: <Store className="w-5 h-5" />, tone: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300' },
              ].map((card) => (
                <div key={card.label} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-lg shadow-slate-200/30 dark:shadow-none">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{card.label}</p>
                      <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{card.value}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.hint}</p>
                    </div>
                    <div className={`rounded-xl p-3 ${card.tone}`}>{card.icon}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="space-y-6">
                {/* Etapa 1: lookup exato do usuário final. */}
                <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200/30 dark:shadow-none">
                  <div className="flex items-center gap-3 mb-4">
                    <UserRoundSearch className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <h2 className="text-lg font-black text-slate-900 dark:text-white">1. Localizar usuário</h2>
                  </div>
                  <form onSubmit={handleLookup} className="space-y-4">
                    <input type="email" value={lookupEmail} onChange={(e) => setLookupEmail(e.target.value)} placeholder="email exato do usuário final" required className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" />
                    <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-cyan-600/20 transition-colors hover:bg-cyan-700 disabled:opacity-60">
                      <Search className="w-4 h-4" /> {isSubmitting ? 'Buscando...' : 'Buscar usuário'}
                    </button>
                  </form>
                </div>

                {lookupResult && (
                  <>
                    {/* Etapa 2: confirmação visual + escolha do SKU antes de gastar crédito. */}
                    <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200/30 dark:shadow-none space-y-5">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Preview do alvo</p>
                      <h2 className="mt-2 text-lg font-black text-slate-900 dark:text-white">{lookupResult.maskedName || 'Usuário sem nome'}</h2>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{lookupResult.maskedEmail}</p>
                      <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">Plano atual: {lookupResult.currentPlan} • Expira em: {lookupResult.premiumExpiresAt ? new Date(lookupResult.premiumExpiresAt).toLocaleString('pt-BR') : 'não aplicável'}</p>
                    </div>

                    <form onSubmit={handleActivate} className="space-y-4">
                      <div>
                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">SKU</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {SKU_OPTIONS.map((sku) => (
                            <button key={sku.id} type="button" onClick={() => setSelectedSku(sku.id)} className={`rounded-2xl border px-4 py-3 text-left transition-all ${selectedSku === sku.id ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/10 dark:border-cyan-700' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:border-cyan-300 dark:hover:border-cyan-700'}`}>
                              <p className="text-sm font-black text-slate-900 dark:text-white">{sku.label}</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Consome {sku.credits} crédito(s)</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-amber-100 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-800 dark:text-amber-200">
                        Você está prestes a ativar <strong>{selectedSkuConfig.label}</strong> para <strong>{lookupResult.maskedEmail}</strong>. Essa ação consome <strong>{selectedSkuConfig.credits}</strong> crédito(s) e não tem botão público de desfazer.
                      </div>

                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-4">
                        <input type="checkbox" checked={confirmationChecked} onChange={(e) => setConfirmationChecked(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500" />
                        <span className="text-sm text-slate-600 dark:text-slate-300">Confirmei visualmente o usuário antes de consumir o crédito.</span>
                      </label>

                      <button type="submit" disabled={isSubmitting || !confirmationChecked} className="w-full rounded-2xl bg-emerald-600 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-emerald-600/20 transition-all hover:bg-emerald-700 disabled:opacity-60">
                        {isSubmitting ? 'Ativando...' : `Ativar Premium (${selectedSkuConfig.credits} crédito${selectedSkuConfig.credits > 1 ? 's' : ''})`}
                      </button>
                    </form>
                  </div>
                  </>
                )}
              </div>

              <div className="space-y-6">
                {/* Extrato e ativações dão rastreabilidade rápida sem depender do painel admin. */}
                <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200/30 dark:shadow-none">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Extrato recente</h2>
                  <div className="mt-4 space-y-3">
                    {(dashboard.recentLedger || []).length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sem movimentações ainda.</p>
                    ) : (
                      dashboard.recentLedger.map((entry: any) => (
                        <div key={entry.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{entry.reason}</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{entry.notes}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-black ${entry.deltaCredits >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{entry.deltaCredits >= 0 ? '+' : ''}{entry.deltaCredits}</p>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Saldo {entry.balanceAfter}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-lg shadow-slate-200/30 dark:shadow-none">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">Ativações recentes</h2>
                  <div className="mt-4 space-y-3">
                    {(dashboard.recentActivations || []).length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sem ativações ainda.</p>
                    ) : (
                      dashboard.recentActivations.map((activation: any) => (
                        <div key={activation.id} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{activation.targetUserNameSnapshot || activation.targetUserEmailSnapshot}</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activation.targetUserEmailSnapshot}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-cyan-600 dark:text-cyan-400">{activation.sku}</p>
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">-{activation.creditsConsumed} crédito(s)</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
