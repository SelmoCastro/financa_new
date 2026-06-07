/**
 * Seção visual especializada de uma tela maior; isola uma parte importante da interface para manter o fluxo mais legível.
 */
import React from 'react';
import {
  BadgePlus,
  CreditCard,
  Clock3,
  Eye,
  Lock,
  LockOpen,
  Mail,
  Phone,
  RefreshCw,
  ShieldAlert,
  Store,
  UserRound,
} from 'lucide-react';
import type { AdminLogic } from './useAdminLogic';
import { formatDate } from './utils';

const statusStyles: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  disabled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
};

export const ResellersSection: React.FC<{ logic: AdminLogic }> = ({ logic }) => {
  const {
    locale,
    resellers,
    resellerSummary,
    selectedResellerId,
    selectedResellerDetail,
    isSavingReseller,
    isLoadingResellerDetail,
    createResellerForm,
    setCreateResellerForm,
    resellerCreditForm,
    setResellerCreditForm,
    selectReseller,
    handleCreateReseller,
    handleAddCredits,
    handleUpdateResellerStatus,
  } = logic;

  return (
    <div className="space-y-4">
      {/* Cards de leitura rápida para o operador ver tamanho da base, saldo agregado e contas problemáticas. */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            label: 'Revendedores',
            value: resellerSummary.total,
            hint: `${resellerSummary.active} ativos`,
            icon: <Store className="w-5 h-5" />,
            tone: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-300',
          },
          {
            label: 'Créditos em aberto',
            value: resellerSummary.totalCredits,
            hint: `${resellerSummary.activations} ativações registradas`,
            icon: <CreditCard className="w-5 h-5" />,
            tone: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300',
          },
          {
            label: 'Suspensos/Desabilitados',
            value: resellerSummary.suspended + resellerSummary.disabled,
            hint: `${resellerSummary.suspended} suspensos • ${resellerSummary.disabled} desabilitados`,
            icon: <ShieldAlert className="w-5 h-5" />,
            tone: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300',
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 shadow-lg shadow-slate-100/50 dark:shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{card.value}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.hint}</p>
              </div>
              <div className={`rounded-xl p-3 ${card.tone}`}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1.8fr] gap-4 items-start">
        <div className="space-y-4">
          {/* Formulário de onboarding operacional do revendedor. */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 shadow-lg shadow-slate-100/50 dark:shadow-none">
            <div className="flex items-center gap-2 mb-4">
              <BadgePlus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">Novo revendedor</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={createResellerForm.displayName} onChange={(e) => setCreateResellerForm({ ...createResellerForm, displayName: e.target.value })} placeholder="Nome do revendedor" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
              <input value={createResellerForm.email} onChange={(e) => setCreateResellerForm({ ...createResellerForm, email: e.target.value })} placeholder="Email de login" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
              <input value={createResellerForm.password} onChange={(e) => setCreateResellerForm({ ...createResellerForm, password: e.target.value })} placeholder="Senha inicial" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
              <input value={createResellerForm.companyName} onChange={(e) => setCreateResellerForm({ ...createResellerForm, companyName: e.target.value })} placeholder="Empresa / marca" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
              <input value={createResellerForm.phone} onChange={(e) => setCreateResellerForm({ ...createResellerForm, phone: e.target.value })} placeholder="Telefone / WhatsApp" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 sm:col-span-2" />
              <textarea value={createResellerForm.notes} onChange={(e) => setCreateResellerForm({ ...createResellerForm, notes: e.target.value })} placeholder="Observações operacionais" rows={3} className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 sm:col-span-2 resize-none" />
            </div>
            <button onClick={handleCreateReseller} disabled={isSavingReseller} className="mt-4 w-full rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-colors">
              {isSavingReseller ? 'Salvando...' : 'Criar revendedor'}
            </button>
          </div>

          {/* Lista mestra de revendedores; o clique troca o detalhe à direita sem sair da tela. */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 shadow-lg shadow-slate-100/50 dark:shadow-none space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">Base cadastrada</h3>
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{resellers.length} itens</span>
            </div>
            {resellers.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum revendedor cadastrado ainda.</p>
            ) : (
              <div className="space-y-3">
                {resellers.map((reseller) => (
                  <button
                    key={reseller.id}
                    onClick={() => selectReseller(reseller.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedResellerId === reseller.id ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/10 dark:border-cyan-700' : 'border-slate-100 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-900/20 hover:border-cyan-200 dark:hover:border-cyan-800'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-slate-800 dark:text-white">{reseller.displayName}</p>
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusStyles[reseller.status] || statusStyles.disabled}`}>{reseller.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{reseller.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-black">Saldo</p>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{reseller.currentBalance}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{reseller.ledgerEntriesCount} lançamentos</span>
                      <span>{reseller.premiumActivationsCount} ativações</span>
                      <span>{reseller.lastLoginAt ? `Último login ${formatDate(reseller.lastLoginAt, locale)}` : 'Sem login ainda'}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 p-4 shadow-lg shadow-slate-100/50 dark:shadow-none min-h-[520px]">
          {!selectedResellerId ? (
            <div className="h-full min-h-[420px] flex flex-col items-center justify-center text-center text-slate-500 dark:text-slate-400">
              <Store className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold">Selecione um revendedor para ver saldo, extrato e ativações.</p>
            </div>
          ) : isLoadingResellerDetail || !selectedResellerDetail ? (
            <div className="h-full min-h-[420px] flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-600 dark:text-cyan-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Cabeçalho do detalhe com identidade do revendedor e saldo atual. */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedResellerDetail.reseller.displayName}</h3>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${statusStyles[selectedResellerDetail.reseller.status] || statusStyles.disabled}`}>{selectedResellerDetail.reseller.status}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                    <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {selectedResellerDetail.reseller.email}</p>
                    {selectedResellerDetail.reseller.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {selectedResellerDetail.reseller.phone}</p>}
                    {selectedResellerDetail.reseller.companyName && <p className="flex items-center gap-2"><Store className="w-4 h-4" /> {selectedResellerDetail.reseller.companyName}</p>}
                    {selectedResellerDetail.createdByAdmin && <p className="flex items-center gap-2"><UserRound className="w-4 h-4" /> Criado por {selectedResellerDetail.createdByAdmin.name || selectedResellerDetail.createdByAdmin.email}</p>}
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40 p-4 min-w-[180px]">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">Saldo atual</p>
                  <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-300">{selectedResellerDetail.currentBalance}</p>
                  <p className="mt-1 text-xs text-emerald-700/70 dark:text-emerald-300/70">Versão do saldo: {selectedResellerDetail.reseller.creditVersion}</p>
                </div>
              </div>

              {selectedResellerDetail.reseller.notes && (
                <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/20 p-4 text-sm text-slate-600 dark:text-slate-300">
                  {selectedResellerDetail.reseller.notes}
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
                {/* Entrada manual de crédito após confirmação externa do Pix. */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 bg-slate-50/70 dark:bg-slate-900/20">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">Adicionar créditos</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="number" min={1} value={resellerCreditForm.credits} onChange={(e) => setResellerCreditForm({ ...resellerCreditForm, credits: Number(e.target.value) || 0 })} placeholder="Créditos" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
                    <input value={resellerCreditForm.reason} onChange={(e) => setResellerCreditForm({ ...resellerCreditForm, reason: e.target.value })} placeholder="Motivo" className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500" />
                    <textarea value={resellerCreditForm.notes} onChange={(e) => setResellerCreditForm({ ...resellerCreditForm, notes: e.target.value })} rows={3} placeholder="Observação obrigatória" className="sm:col-span-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
                  </div>
                  <button onClick={() => handleAddCredits(selectedResellerDetail.reseller.id)} disabled={isSavingReseller} className="mt-4 w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 text-xs font-black uppercase tracking-[0.18em] transition-colors">
                    {isSavingReseller ? 'Processando...' : 'Creditar saldo'}
                  </button>
                </div>

                {/* Alterar status aqui impacta imediatamente a capacidade do revendedor de fazer login e ativar Premium. */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 bg-slate-50/70 dark:bg-slate-900/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">Status operacional</h4>
                  </div>
                  <div className="space-y-2">
                    <button onClick={() => handleUpdateResellerStatus(selectedResellerDetail.reseller.id, 'active')} disabled={isSavingReseller || selectedResellerDetail.reseller.status === 'active'} className="w-full rounded-xl border border-emerald-200 dark:border-emerald-700/50 px-3 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-60">{selectedResellerDetail.reseller.status === 'active' ? 'Ativo' : 'Reativar'}</button>
                    <button onClick={() => handleUpdateResellerStatus(selectedResellerDetail.reseller.id, 'suspended')} disabled={isSavingReseller || selectedResellerDetail.reseller.status === 'suspended'} className="w-full rounded-xl border border-amber-200 dark:border-amber-700/50 px-3 py-2.5 text-sm font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-60">Suspender</button>
                    <button onClick={() => handleUpdateResellerStatus(selectedResellerDetail.reseller.id, 'disabled')} disabled={isSavingReseller || selectedResellerDetail.reseller.status === 'disabled'} className="w-full rounded-xl border border-rose-200 dark:border-rose-700/50 px-3 py-2.5 text-sm font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-60">Desabilitar</button>
                  </div>
                  <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                    <p className="flex items-center gap-2"><Clock3 className="w-3.5 h-3.5" /> Criado em {formatDate(selectedResellerDetail.reseller.createdAt, locale)}</p>
                    <p className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Atualizado em {formatDate(selectedResellerDetail.reseller.updatedAt, locale)}</p>
                    <p className="flex items-center gap-2"><LockOpen className="w-3.5 h-3.5" /> Último login {selectedResellerDetail.reseller.lastLoginAt ? formatDate(selectedResellerDetail.reseller.lastLoginAt, locale) : 'nunca'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {/* Extrato imutável de créditos. */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 bg-slate-50/70 dark:bg-slate-900/20">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white mb-3">Extrato recente</h4>
                  <div className="space-y-3">
                    {selectedResellerDetail.recentLedger.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sem lançamentos ainda.</p>
                    ) : selectedResellerDetail.recentLedger.map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{entry.reason}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{entry.notes}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-black ${entry.deltaCredits >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{entry.deltaCredits >= 0 ? '+' : ''}{entry.deltaCredits}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-black">Saldo {entry.balanceAfter}</p>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">{formatDate(entry.createdAt, locale)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Histórico recente de consumo, útil para suporte e auditoria. */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-700/50 p-4 bg-slate-50/70 dark:bg-slate-900/20">
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white mb-3">Ativações recentes</h4>
                  <div className="space-y-3">
                    {selectedResellerDetail.recentActivations.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Sem ativações ainda.</p>
                    ) : selectedResellerDetail.recentActivations.map((activation) => (
                      <div key={activation.id} className="rounded-xl border border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{activation.targetUserNameSnapshot || activation.targetUserEmailSnapshot}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{activation.targetUserEmailSnapshot}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-cyan-600 dark:text-cyan-400">{activation.sku}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-black">-{activation.creditsConsumed} crédito(s)</p>
                          </div>
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">Expira em {formatDate(activation.expiresAt, locale)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
