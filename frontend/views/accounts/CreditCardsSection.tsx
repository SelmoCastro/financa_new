import React from 'react';
import { MoreVertical, Edit3, Trash2, CreditCard as CreditCardIcon, Nfc, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { CreditCard } from '../../types';
import { CreditCardInstallmentDTO, computeSchedule } from '../../services/creditCardService';
import { useCurrency } from '../../context/CurrencyContext';

interface CreditCardsSectionProps {
  isPrivacyEnabled: boolean;
  creditCards: CreditCard[];
  cardInstallments: Record<string, CreditCardInstallmentDTO[]>;
  openCardMenuId: string | null;
  cardMenuRef: React.RefObject<HTMLDivElement | null>;
  expandedInstallId: string | null;
  onAddCard: () => void;
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (id: string, name: string) => void;
  onToggleCardMenu: (id: string | null) => void;
  onOpenInstallModal: (cardId: string) => void;
  onDeleteInstallment: (id: string) => void;
  onToggleExpand: (id: string | null) => void;
}

export const CreditCardsSection: React.FC<CreditCardsSectionProps> = ({
  isPrivacyEnabled, creditCards, cardInstallments,
  openCardMenuId, cardMenuRef, expandedInstallId,
  onAddCard, onEditCard, onDeleteCard, onToggleCardMenu,
  onOpenInstallModal, onDeleteInstallment, onToggleExpand,
}) => {
  const { formatCurrency } = useCurrency();

  return (
    <section className="pt-12 border-t border-slate-200 dark:border-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Meios de Pagamento</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            Cartões de Crédito
          </h3>
        </div>
        <button
          onClick={onAddCard}
          className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/10 bg-orange-50 dark:bg-slate-900 px-6 py-3 rounded-2xl transition-all active:scale-95 border border-orange-100 dark:border-orange-500/20"
        >
          + Adicionar Cartão
        </button>
      </div>

      {creditCards.length === 0 ? (
        <div className="glass-card border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-16 text-center">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 mx-auto rounded-[2rem] flex items-center justify-center shadow-sm mb-8 border border-slate-100 dark:border-slate-800">
            <CreditCardIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">Nenhum cartão cadastrado</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">Adicione seus cartões de crédito para acompanhar limites, faturas e datas de vencimento de forma inteligente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {creditCards.map(card => (
            <CreditCardItem
              key={card.id}
              card={card}
              isPrivacyEnabled={isPrivacyEnabled}
              installments={cardInstallments[card.id] || []}
              openCardMenuId={openCardMenuId}
              cardMenuRef={cardMenuRef}
              expandedInstallId={expandedInstallId}
              formatCurrency={formatCurrency}
              onEditCard={onEditCard}
              onDeleteCard={onDeleteCard}
              onToggleCardMenu={onToggleCardMenu}
              onOpenInstallModal={onOpenInstallModal}
              onDeleteInstallment={onDeleteInstallment}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </section>
  );
};

// ─── Card Item Sub-component ────────────────────────────────

interface CreditCardItemProps {
  card: CreditCard;
  isPrivacyEnabled: boolean;
  installments: CreditCardInstallmentDTO[];
  openCardMenuId: string | null;
  cardMenuRef: React.RefObject<HTMLDivElement | null>;
  expandedInstallId: string | null;
  formatCurrency: (v: number) => string;
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (id: string, name: string) => void;
  onToggleCardMenu: (id: string | null) => void;
  onOpenInstallModal: (cardId: string) => void;
  onDeleteInstallment: (id: string) => void;
  onToggleExpand: (id: string | null) => void;
}

const CreditCardItem: React.FC<CreditCardItemProps> = ({
  card, isPrivacyEnabled, installments,
  openCardMenuId, cardMenuRef, expandedInstallId, formatCurrency,
  onEditCard, onDeleteCard, onToggleCardMenu,
  onOpenInstallModal, onDeleteInstallment, onToggleExpand,
}) => (
  <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl shadow-slate-900/40 overflow-hidden group hover:translate-y-[-4px] transition-all duration-300 border border-white/5" style={{ overflow: 'visible' }}>
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mt-20 -mr-20 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>

    <div className="flex justify-between items-start mb-16 relative z-10">
      <div>
        <h5 className="text-2xl font-black tracking-tight mb-2">{card.name}</h5>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Débito em:</span>
          <span className="text-[10px] font-bold text-slate-300">{card.account?.name || 'Não associado'}</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-12 h-8 bg-white/10 rounded-lg flex items-center justify-center border border-white/10 backdrop-blur-sm">
          <div className="w-6 h-4 bg-amber-400/40 rounded-sm"></div>
        </div>
        <div className="relative z-40">
          <button
            onClick={() => onToggleCardMenu(openCardMenuId === card.id ? null : card.id)}
            className="text-white/30 hover:text-white transition-all p-2 rounded-xl hover:bg-white/10"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {openCardMenuId === card.id && (
            <div ref={cardMenuRef} className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 p-2">
              <button
                onClick={() => { onEditCard(card); onToggleCardMenu(null); }}
                className="w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all flex items-center gap-3 rounded-xl"
              >
                <Edit3 className="w-4 h-4" />
                Editar Cartão
              </button>
              <button
                onClick={() => onDeleteCard(card.id, card.name)}
                className="w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-3 rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Cartão
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    <div className="flex justify-between items-end relative z-10">
      <div className="space-y-1">
        <p className="text-white/40 text-[10px] uppercase tracking-widest font-black">Limite Total</p>
        <p className="text-3xl font-black tracking-tighter">
          {isPrivacyEnabled ? '•••••' : formatCurrency(Number(card.limit))}
        </p>
      </div>
      <div className="text-right">
        <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-sm">
          <p className="text-white/40 text-[8px] uppercase font-black tracking-widest mb-0.5">Fech. / Venc.</p>
          <p className="text-sm font-black tracking-[0.2em]">{card.closingDay} / {card.dueDay}</p>
        </div>
      </div>
    </div>

    <div className="mt-8 pt-6 border-t border-white/5 flex justify-between relative z-10">
      <div className="flex -space-x-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-800 bg-slate-700"></div>
        ))}
      </div>
      <Nfc className="w-6 h-6 text-white/20" />
    </div>

    {/* Installments Section */}
    <div className="mt-6 pt-6 border-t border-white/10 relative z-10">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-white/40 flex items-center gap-1.5">
          <ShoppingBag className="w-3 h-3" /> Compras Parceladas
        </p>
        <button
          onClick={() => onOpenInstallModal(card.id)}
          className="text-[8px] font-black uppercase tracking-wider text-cyan-400 hover:text-cyan-300 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg transition-all"
        >
          + Nova
        </button>
      </div>

      {installments.length === 0 ? (
        <p className="text-[10px] text-white/30 italic">Nenhuma compra parcelada</p>
      ) : (
        <div className="space-y-2">
          {installments.map(inst => {
            const isExpanded = expandedInstallId === inst.id;
            const schedule = computeSchedule(inst);
            const entryAmount = inst.entryAmount ? Number(inst.entryAmount) : 0;
            const hasEntry = entryAmount > 0;

            return (
              <div key={inst.id} className="bg-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => onToggleExpand(isExpanded ? null : inst.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/5 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-700 dark:text-white truncate">{inst.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-cyan-300">
                        {isPrivacyEnabled ? '•••••' : formatCurrency(hasEntry ? entryAmount : Number(inst.amountPerMonth))}
                      </span>
                      {hasEntry && (
                        <span className="text-[8px] font-bold text-amber-300/70 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          entrada
                        </span>
                      )}
                      <span className="text-[9px] text-white/40">
                        {inst.currentInstallment}/{inst.installmentCount}
                      </span>
                      <div className="flex-1 h-1 bg-white/10 rounded-full max-w-[60px]">
                        <div
                          className="h-full bg-cyan-500/60 rounded-full transition-all"
                          style={{ width: `${(inst.currentInstallment / inst.installmentCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteInstallment(inst.id); }}
                      className="p-1 text-white/30 hover:text-rose-400 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {isExpanded
                      ? <ChevronUp className="w-3.5 h-3.5 text-white/30" />
                      : <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                    }
                  </div>
                </button>

                {isExpanded && schedule.length > 0 && (
                  <div className="px-3 pb-2 border-t border-white/5 pt-2">
                    <div className="space-y-1">
                      {schedule.map(s => {
                        const isPaid = s.installmentNumber <= inst.currentInstallment;
                        return (
                          <div key={s.installmentNumber} className="flex items-center justify-between text-[10px] py-1 px-1">
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${isPaid ? 'bg-cyan-500/30 text-cyan-300' : 'bg-white/5 text-white/40'}`}>
                                {s.installmentNumber}
                              </span>
                              <span className={`font-medium ${isPaid ? 'text-white/50 line-through' : 'text-white/70'}`}>
                                {formatMonth(s.month)}/{s.year.toString().slice(2)}
                              </span>
                            </div>
                            <span className={`font-bold ${isPaid ? 'text-white/30 line-through' : s.installmentNumber === 1 && hasEntry ? 'text-amber-300' : 'text-cyan-300'}`}>
                              {isPrivacyEnabled ? '•••••' : formatCurrency(s.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between text-[10px] mt-2 pt-2 border-t border-white/10 px-1">
                      <span className="font-bold text-white/50">Total</span>
                      <span className="font-black text-white">
                        {isPrivacyEnabled ? '•••••' : formatCurrency(Number(inst.totalAmount))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
);

// Helper (same as service export, kept local for readability)
function formatMonth(month: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[month - 1] || '';
}