/**
 * Seção visual especializada de uma tela maior; isola uma parte importante da interface para manter o fluxo mais legível.
 */
import React from 'react';
import { Wallet, Sparkles, Plus, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import { BankIcon } from '../../components/BankIcon';
import { ReadOnlyBadge } from '../../components/ReadOnlyBadge';
import { Account } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { useExceeding } from '../../context/ExceedingContext';

interface AccountsSectionProps {
  isPrivacyEnabled: boolean;
  accounts: Account[];
  totalBalance: number;
  openMenuId: string | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onAddAccount: () => void;
  onEditAccount: (acc: Account) => void;
  onDeleteAccount: (id: string, name: string) => void;
  onToggleMenu: (id: string | null) => void;
}

export const AccountsSection: React.FC<AccountsSectionProps> = ({
  isPrivacyEnabled, accounts, totalBalance, openMenuId, menuRef,
  onAddAccount, onEditAccount, onDeleteAccount, onToggleMenu,
}) => {
  const { formatCurrency } = useCurrency();
  const { isExceeding } = useExceeding();

  return (
    <section>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">Patrimônio</p>
          <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-3">
            Minhas Contas
          </h3>
        </div>
        <button
          onClick={onAddAccount}
          className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-500/10 bg-cyan-50 dark:bg-slate-900 px-6 py-3 rounded-2xl transition-all active:scale-95 border border-cyan-100 dark:border-cyan-500/20"
        >
          + Adicionar Conta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Card Total */}
        <div className="bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-2xl md:rounded-[2.5rem] p-8 shadow-xl shadow-cyan-600/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mt-20 -mr-20 blur-3xl group-hover:opacity-20 transition-all duration-700"></div>
          <p className="text-cyan-100 font-black uppercase tracking-[0.2em] text-[10px] mb-4 relative z-10">Saldo Consolidado</p>
          <h4 className="text-4xl font-black tracking-tighter relative z-10">
            {isPrivacyEnabled ? '•••••' : formatCurrency(totalBalance)}
          </h4>
          <div className="mt-8 flex items-center gap-2 relative z-10">
            <div className="p-2 bg-white/20 rounded-xl">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-widest">{accounts.length} contas ativas</span>
          </div>
        </div>

        {/* Lista de Contas */}
        {accounts.length === 0 ? (
          <div className="md:col-span-1 lg:col-span-2 flex flex-col items-center justify-center p-8 glass-card border-dashed border-cyan-200 dark:border-cyan-500/30 rounded-[2.5rem] text-center">
            <div className="w-16 h-16 bg-cyan-50 dark:bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-cyan-400" />
            </div>
            <h4 className="text-lg font-black text-slate-800 dark:text-white mb-2">Sua primeira Conta!</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mb-8 font-medium leading-relaxed">Você precisa adicionar pelo menos uma conta bancária ou carteira para conseguir registrar seus primeiros lançamentos.</p>
            <button
              onClick={onAddAccount}
              className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-cyan-600/20 active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Conta Agora
            </button>
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc.id} className="glass-card rounded-2xl md:rounded-[2.5rem] p-4 md:p-8 hover:translate-y-[-4px] transition-all duration-300 group" style={{ overflow: 'visible' }}>
              <div className="flex justify-between items-start mb-8">
                <div className="p-1 bg-white dark:bg-slate-950 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                  <BankIcon name={acc.name} type={acc.type} />
                </div>
                <div className="relative z-40">
                  <button
                    onClick={() => onToggleMenu(openMenuId === acc.id ? null : acc.id)}
                    className="text-slate-400 dark:text-slate-500 hover:text-cyan-500 transition-all p-2 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {openMenuId === acc.id && (
                    <div ref={menuRef} className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 p-2">
                      <button
                        onClick={() => onEditAccount(acc)}
                        disabled={isExceeding('account', acc.id)}
                        className={`w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-cyan-50 dark:hover:bg-slate-800 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all flex items-center gap-3 rounded-xl ${isExceeding('account', acc.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isExceeding('account', acc.id) ? 'Recurso em modo somente leitura' : ''}
                      >
                        <Edit3 className="w-4 h-4" />
                        Editar Conta
                      </button>
                      <button
                        onClick={() => onDeleteAccount(acc.id, acc.name)}
                        disabled={isExceeding('account', acc.id)}
                        className={`w-full text-left px-4 py-4 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-all flex items-center gap-3 rounded-xl ${isExceeding('account', acc.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={isExceeding('account', acc.id) ? 'Recurso em modo somente leitura' : ''}
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Conta
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1 mb-6">
                <div className="flex items-center gap-2">
                  <h5 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{acc.name}</h5>
                  <ReadOnlyBadge type="account" id={acc.id} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{
                  acc.type === 'CHECKING' ? 'Conta Corrente' :
                    acc.type === 'SAVINGS' ? 'Conta Poupança' :
                      (acc.type === 'WALLET' || acc.type === 'CASH') ? 'Carteira (Dinheiro)' : 'Corretora'
                }</p>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                {isPrivacyEnabled ? '•••••' : formatCurrency(Number(acc.balance))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};