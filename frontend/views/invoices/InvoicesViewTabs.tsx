import React, { useMemo } from 'react';
import { Receipt, CreditCard, ShoppingBag } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { Skeleton } from '../../components/Skeleton';

interface InvoicesViewTabsProps {
  isPrivacyEnabled: boolean;
  creditCards: any[];
  accounts: any[];
  selectedCardId: string;
  setSelectedCardId: (id: string) => void;
  invoices: any[];
  currentInvoice: any;
  isInvoicesLoading: boolean;
  expandedInvoice: string | null;
  setExpandedInvoice: (id: string | null) => void;
  payAccountId: string;
  setPayAccountId: (id: string) => void;
  isPaying: string | null;
  handleCloseInvoice: () => void;
  handlePayInvoice: (invoiceId: string, amount: number) => void;
  cardInstallments: Record<string, any[]>;
  expandedInstallId: string | null;
  setExpandedInstallId: (id: string | null) => void;
  openInstallModal: (cardId: string) => void;
  handleDeleteInstallment: (id: string) => void;
  openCardMenuId: string | null;
  setOpenCardMenuId: (id: string | null) => void;
  cardMenuRef: React.RefObject<HTMLDivElement | null>;
  onEditCard: (card: any) => void;
  onDeleteCard: (id: string, name: string) => void;
  onAddCard: () => void;
  onAddInstallment: (cardId: string) => void;
}

export const InvoicesViewTabs: React.FC<InvoicesViewTabsProps> = (props) => {
  const [tab, setTab] = React.useState<'invoices' | 'cards' | 'installments'>('invoices');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { id: 'invoices', label: 'Faturas', icon: Receipt },
          { id: 'cards', label: 'Cartões', icon: CreditCard },
          { id: 'installments', label: 'Parcelas', icon: ShoppingBag },
        ].map((t: any) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab === t.id
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'invoices' && <InvoicesTab {...props} />}
      {tab === 'cards' && <CardsTab {...props} />}
      {tab === 'installments' && <InstallmentsTab {...props} />}
    </div>
  );
};

// ─── TAB: Faturas ───

const InvoicesTab: React.FC<InvoicesViewTabsProps> = ({
  isPrivacyEnabled, creditCards, selectedCardId, setSelectedCardId,
  invoices, currentInvoice, isInvoicesLoading, expandedInvoice, setExpandedInvoice,
  payAccountId, setPayAccountId, isPaying, handleCloseInvoice, handlePayInvoice,
  accounts,
}) => {
  const { formatCurrency } = useCurrency();
  const selectedCard = creditCards.find((c: any) => c.id === selectedCardId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-black text-slate-800 dark:text-white">Faturas</h2>
        {creditCards.map((card: any) => (
          <button key={card.id} onClick={() => setSelectedCardId(card.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${selectedCardId === card.id ? 'bg-cyan-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}>
            {card.name}
          </button>
        ))}
      </div>

      {selectedCard && (
        <div className="flex items-center gap-4">
          <button onClick={handleCloseInvoice} disabled={isInvoicesLoading}
            className="text-xs font-bold bg-cyan-600 text-white px-4 py-2 rounded-xl hover:bg-cyan-700 disabled:opacity-50">
            Fechar Fatura
          </button>
        </div>
      )}

      {currentInvoice && (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/5 dark:to-blue-500/5 rounded-2xl border border-cyan-200 dark:border-cyan-500/20 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-black text-sm text-slate-800 dark:text-white">Fatura em Aberto</p>
              <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold">Fecha {new Date(currentInvoice.closingDate).toLocaleDateString('pt-BR')}</p>
            </div>
            <span className="text-sm font-black text-cyan-700 dark:text-cyan-300">{isPrivacyEnabled ? '••••' : formatCurrency(currentInvoice.totalAmount)}</span>
          </div>
          <div className="space-y-1.5">
            {currentInvoice.transactions.map((tx: any) => (
              <div key={tx.id} className="flex justify-between items-center p-2 bg-white/60 dark:bg-slate-900/60 rounded-lg text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-200">{tx.description}</span>
                <span className="font-black text-slate-800 dark:text-white">{isPrivacyEnabled ? '••••' : formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isInvoicesLoading ? (
        <div className="space-y-3"><Skeleton className="h-20 rounded-xl" /><Skeleton className="h-20 rounded-xl" /></div>
      ) : invoices.length === 0 ? (
        <p className="text-slate-400 text-sm">Nenhuma fatura fechada ainda.</p>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv: any) => {
            const remaining = inv.totalAmount - inv.paidAmount;
            const isExpanded = expandedInvoice === inv.id;
            return (
              <div key={inv.id} className={`border rounded-xl overflow-hidden ${inv.isPaid ? 'border-emerald-200' : 'border-amber-200'}`}>
                <button onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                  className="w-full p-4 flex justify-between items-center text-left">
                  <div>
                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">{inv.creditCardName} — {String(inv.referenceMonth).padStart(2,'0')}/{inv.referenceYear}</p>
                    <p className="text-xs text-slate-400">Vence {new Date(inv.dueDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <span className={`text-sm font-black ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{isPrivacyEnabled ? '••••' : formatCurrency(remaining)}</span>
                </button>
                {isExpanded && (
                  <div className="p-4 border-t bg-slate-50 dark:bg-slate-800/30 space-y-3">
                    {!inv.isPaid && remaining > 0 && (
                      <div className="flex items-end gap-3">
                        <select value={payAccountId} onChange={e => setPayAccountId(e.target.value)}
                          className="px-3 py-2 rounded-lg border text-sm font-bold">
                          {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <button onClick={() => handlePayInvoice(inv.id, remaining)} disabled={isPaying === inv.id}
                          className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold">
                          Pagar {formatCurrency(remaining)}
                        </button>
                      </div>
                    )}
                    {inv.transactions?.map((tx: any) => (
                      <div key={tx.id} className="flex justify-between text-xs">
                        <span>{tx.description}</span>
                        <span className="font-bold">{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── TAB: Cartões ───

const CardsTab: React.FC<InvoicesViewTabsProps> = ({
  isPrivacyEnabled, creditCards, accounts, openCardMenuId, setOpenCardMenuId, cardMenuRef,
  onEditCard, onDeleteCard, onAddCard,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 dark:text-white">Cartões de Crédito</h2>
        <button onClick={onAddCard} className="text-xs font-bold bg-cyan-600 text-white px-4 py-2 rounded-xl">
          + Adicionar Cartão
        </button>
      </div>

      {creditCards.length === 0 ? (
        <p className="text-slate-400 text-sm">Nenhum cartão cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {creditCards.map((card: any) => (
            <div key={card.id} className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl p-6 text-white">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-lg font-black">{card.name}</p>
                  <p className="text-xs text-slate-400">{card.account?.name || 'Sem conta'}</p>
                </div>
                <div className="relative">
                  <button onClick={() => setOpenCardMenuId(openCardMenuId === card.id ? null : card.id)}
                    className="text-white/50 hover:text-white p-1">•••</button>
                  {openCardMenuId === card.id && (
                    <div ref={cardMenuRef} className="absolute right-0 top-full mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                      <button onClick={() => { onEditCard(card); setOpenCardMenuId(null); }}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all flex items-center gap-2">
                        <span>✏️</span> Editar Cartão
                      </button>
                      <button onClick={() => onDeleteCard(card.id, card.name)}
                        className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-2">
                        <span>🗑️</span> Excluir Cartão
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-white/40 text-[10px] uppercase">Limite</p>
                  <p className="text-xl font-black">{isPrivacyEnabled ? '••••' : formatCurrency(card.limit)}</p>
                </div>
                <div className="text-right bg-white/10 px-3 py-2 rounded-xl">
                  <p className="text-white/40 text-[8px] uppercase">Fecha / Vence</p>
                  <p className="text-sm font-black">{card.closingDay} / {card.dueDay}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── TAB: Parcelas ───

const InstallmentsTab: React.FC<InvoicesViewTabsProps> = ({
  isPrivacyEnabled, creditCards, cardInstallments, expandedInstallId, setExpandedInstallId,
  openInstallModal, handleDeleteInstallment,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-slate-800 dark:text-white">Compras Parceladas</h2>
      </div>

      {creditCards.length === 0 ? (
        <p className="text-slate-400 text-sm">Cadastre um cartão primeiro.</p>
      ) : (
        <div className="space-y-6">
          {creditCards.map((card: any) => {
            const installs = cardInstallments[card.id] || [];
            return (
              <div key={card.id}>
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">{card.name}</p>
                  <button onClick={() => openInstallModal(card.id)}
                    className="text-xs font-bold text-cyan-600 hover:text-cyan-500">
                    + Nova Compra
                  </button>
                </div>
                {installs.length === 0 ? (
                  <p className="text-xs text-slate-400 ml-2">Nenhuma compra parcelada</p>
                ) : (
                  <div className="space-y-2">
                    {installs.map((inst: any) => (
                      <div key={inst.id} className="border rounded-xl p-3 bg-slate-50 dark:bg-slate-800/30">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{inst.description}</p>
                            <p className="text-xs text-slate-400">{inst.currentInstallment}/{inst.installmentCount} parcelas</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-800 dark:text-white">{isPrivacyEnabled ? '••••' : formatCurrency(inst.amountPerMonth)}/mês</span>
                            <button onClick={() => handleDeleteInstallment(inst.id)} className="text-xs text-rose-500 hover:text-rose-700">✕</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
