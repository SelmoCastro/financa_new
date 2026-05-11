import React from 'react';
import { MoreVertical, Edit3, Trash2, CreditCard as CreditCardIcon, Nfc, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import { CreditCard } from '../../types';
import { CreditCardInstallmentDTO, computeSchedule } from '../../services/creditCardService';
import { useCurrency } from '../../context/CurrencyContext';
import { ReadOnlyBadge } from '../../components/ReadOnlyBadge';
import { useExceeding } from '../../context/ExceedingContext';

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
  const { isExceeding } = useExceeding();

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
              isExceeding={isExceeding}
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
  isExceeding: (type: 'account' | 'budget' | 'creditCard' | 'goal', id: string) => boolean;
  onEditCard: (card: CreditCard) => void;
  onDeleteCard: (id: string, name: string) => void;
  onToggleCardMenu: (id: string | null) => void;
  onOpenInstallModal: (cardId: string) => void;
  onDeleteInstallment: (id: string) => void;
  onToggleExpand: (id: string | null) => void;
}

const CreditCardItem: React.FC<CreditCardItemProps> = ({
  card, isPrivacyEnabled, installments,
  openCardMenuId, cardMenuRef, expandedInstallId, formatCurrency, isExceeding,
  onEditCard, onDeleteCard, onToggleCardMenu,
  onOpenInstallModal, onDeleteInstallment, onToggleExpand,
}) => (
  <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl shadow-slate-900/40 overflow-hidden group hover:translate-y-[-4px] transition-all duration-300 border border-white/5" style={{ overflow: 'visible' }}>
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mt-20 -mr-20 blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>

    <div className="flex justify-between items-start mb-16 relative z-10">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h5 className="text-2xl font-black tracking-tight">{card.name}</h5>
          <ReadOnlyBadge type="creditCard" id={card.id} />
        </div>
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
                disabled={isExceeding('creditCard', card.id)}
                className={`w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all flex items-center gap-3 rounded-xl ${isExceeding('creditCard', card.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isExceeding('creditCard', card.id) ? 'Recurso em modo somente leitura' : ''}
              >
                <Edit3 className="w-4 h-4" />
                Editar Cartão
              </button>
              <button
                onClick={() => onDeleteCard(card.id, card.name)}
                disabled={isExceeding('creditCard', card.id)}
                className={`w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-3 rounded-xl ${isExceeding('creditCard', card.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={isExceeding('creditCard', card.id) ? 'Recurso em modo somente leitura' : ''}
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

    {/* Installments moved to dedicated Faturas tab */}
  </div>
);

// Helper (same as service export, kept local for readability)
function formatMonth(month: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[month - 1] || '';
}