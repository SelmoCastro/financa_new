import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { TransactionType, Transaction, Account, CreditCard, Category, ACCOUNT_TYPE_LABELS } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { toYYYYMMDD } from '../utils/dateUtils';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdate?: (transaction: Transaction) => void;
  onClose: () => void;
  existingCategories: string[];
  editingTransaction?: Transaction | null;
  accounts: Account[];
  creditCards: CreditCard[];
  categories: Category[];
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onAdd,
  onUpdate,
  onClose,
  existingCategories,
  editingTransaction,
  accounts: externalAccounts,
  creditCards: externalCreditCards,
  categories: externalCategories
}) => {
  const [description, setDescription] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(toYYYYMMDD(new Date()));
  const [isFixed, setIsFixed] = useState(false);
  const [sharedWithEmail, setSharedWithEmail] = useState('');

  // New States
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');

  const { currencySymbol, locale } = useCurrency();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const amount = parseInt(digits) / 100;
    return amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Auto-select first account when accounts become available
  useEffect(() => {
    if (externalAccounts.length > 0 && !editingTransaction && !accountId) {
      setAccountId(externalAccounts[0].id);
    }
  }, [externalAccounts, editingTransaction]);

  // Reset category if type changes and current category is no longer valid
  useEffect(() => {
    if (!type || !externalCategories.length) return;

    const currentCat = externalCategories.find(c => c.id === categoryId);
    if (currentCat && currentCat.type !== type && currentCat.type !== 'TRANSFER') {
      setCategoryId('');
    }
  }, [type, externalCategories]);

  useEffect(() => {
    if (editingTransaction) {
      setDescription(editingTransaction.description);
      const initialValue = (editingTransaction.amount * 100).toString();
      setDisplayAmount(formatCurrency(initialValue));
      setType(editingTransaction.type);

      // Select correct IDs
      setCategoryId(editingTransaction.categoryId || '');
      setAccountId(editingTransaction.accountId || editingTransaction.account?.id || '');
      setCreditCardId(editingTransaction.creditCardId || '');

      setDate(toYYYYMMDD(new Date(editingTransaction.date)));
      setIsFixed(editingTransaction.isFixed || false);
      setSharedWithEmail(editingTransaction.sharedWithEmail || '');
    }
  }, [editingTransaction]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setDisplayAmount(formatCurrency(rawValue));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(displayAmount.replace(/\./g, '').replace(',', '.'));

    if (!description || isNaN(numericAmount) || numericAmount <= 0) return;

    if (type === 'TRANSFER') {
      if (!accountId || !destinationAccountId) {
        alert('Selecione as contas de origem e destino.');
        return;
      }
      if (accountId === destinationAccountId) {
        alert('A conta de origem e destino não podem ser iguais.');
        return;
      }
    }

    const transactionData = {
      description,
      amount: numericAmount,
      type,
      categoryId: type === 'TRANSFER' ? undefined : (categoryId || undefined),
      accountId: accountId || undefined,
      destinationAccountId: type === 'TRANSFER' ? (destinationAccountId || undefined) : undefined,
      creditCardId: type === 'TRANSFER' ? undefined : (creditCardId || undefined),
      date: new Date(date).toISOString(),
      isFixed,
      sharedWithEmail: sharedWithEmail.trim() || undefined
    };

    setIsSubmitting(true);
    try {
      if (editingTransaction && onUpdate) {
        await (onUpdate as any)({ ...transactionData, id: editingTransaction.id } as unknown as Transaction);
      } else {
        await (onAdd as any)(transactionData as unknown as Omit<Transaction, 'id'>);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };





  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-end sm:items-center justify-center z-[999] p-0 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2.5rem] w-full sm:max-w-md max-h-[90vh] sm:max-h-[85vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
        <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="font-black text-xl text-slate-900 dark:text-white tracking-tight">
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mt-0.5">
              {editingTransaction ? 'Atualize as informações' : 'Registre sua movimentação'}
            </p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-95 text-slate-400 dark:text-slate-500 shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-8 space-y-5 sm:space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          <div className="flex gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-[1.5rem] border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${type === 'EXPENSE' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-lg shadow-rose-600/10 border border-rose-100 dark:border-rose-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${type === 'INCOME' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-600/10 border border-emerald-100 dark:border-emerald-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setType('TRANSFER')}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${type === 'TRANSFER' ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-lg shadow-sky-600/10 border border-sky-100 dark:border-sky-900/30' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              Transf.
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Descrição do Lançamento</label>
            <div className="relative group">
              <input
                autoFocus
                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700"
                placeholder="Ex: Aluguel, Academia, Salário..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Valor</label>
              <div className="relative group">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600 font-black text-sm pointer-events-none group-focus-within:text-cyan-500 transition-colors">{currencySymbol}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full pl-12 pr-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-black text-slate-800 dark:text-white"
                  value={displayAmount}
                  placeholder="0,00"
                  onChange={handleAmountChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Data</label>
              <input
                type="date"
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-black text-slate-700 dark:text-white"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-5">
            {type !== 'TRANSFER' && (
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1 ml-1">Categoria</label>
                <div className="relative group">
                  <select
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 dark:text-white appearance-none cursor-pointer"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Nenhuma / Outros</option>
                    {externalCategories.filter(c => c.type === 'INCOME').length > 0 && type === 'INCOME' && (
                      <optgroup label="Entradas (Rendas)" className="dark:bg-slate-900">
                        {externalCategories.filter(c => c.type === 'INCOME').map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </optgroup>
                    )}

                    {type === 'EXPENSE' && (
                      <>
                        <optgroup label="Necessidades (Essencial)" className="dark:bg-slate-900">
                          {externalCategories.filter(c =>
                            ['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Combustível / Gasolina', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais']
                              .includes(c.name)
                          ).map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </optgroup>

                        <optgroup label="Desejos (Estilo de Vida)" className="dark:bg-slate-900">
                          {externalCategories.filter(c =>
                            ['Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Cuidados com Pets', 'Viagens']
                              .includes(c.name)
                          ).map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </optgroup>

                        <optgroup label="Objetivos (Quitação e Reserva)" className="dark:bg-slate-900">
                          {externalCategories.filter(c =>
                            ['Aplicações / Poupança', 'Pagamento de Dívidas']
                              .includes(c.name)
                          ).map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-cyan-500 transition-colors">
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">{type === 'TRANSFER' ? 'Origem' : 'Conta'}</label>
                <div className="relative group">
                  <select
                    required
                    className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 dark:text-white appearance-none cursor-pointer"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    <option value="" disabled>Selecione...</option>
                    {externalAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({ACCOUNT_TYPE_LABELS[acc.type] || acc.type})</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-cyan-500 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
                  {type === 'TRANSFER' ? 'Destino' : 'Cartão (Opcional)'}
                </label>
                <div className="relative group">
                  {type === 'TRANSFER' ? (
                    <select
                      required
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 dark:text-white appearance-none cursor-pointer"
                      value={destinationAccountId}
                      onChange={(e) => setDestinationAccountId(e.target.value)}
                    >
                      <option value="" disabled>Selecione...</option>
                      {externalAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({ACCOUNT_TYPE_LABELS[acc.type] || acc.type})</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 dark:text-white appearance-none cursor-pointer"
                      value={creditCardId}
                      onChange={(e) => {
                        setCreditCardId(e.target.value);
                        if (e.target.value) {
                          const selectedCard = externalCreditCards.find(c => c.id === e.target.value);
                          if (selectedCard && selectedCard.accountId) {
                            setAccountId(selectedCard.accountId);
                          }
                        }
                      }}
                    >
                      <option value="">Nenhum (Débito)</option>
                      {externalCreditCards.map(card => (
                        <option key={card.id} value={card.id}>{card.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-cyan-500 transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="block text-[10px] font-black text-cyan-500 dark:text-cyan-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-500 dark:bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-500/50"></span>
              Compartilhar (Email Amigo)
            </label>
            <input
              type="email"
              className="w-full px-6 py-4 bg-cyan-50/20 dark:bg-cyan-500/5 border border-cyan-100 dark:border-cyan-950 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-bold text-slate-700 dark:text-white placeholder:text-slate-300 dark:placeholder:text-cyan-900/30"
              placeholder="email@amigo.com"
              value={sharedWithEmail}
              onChange={(e) => setSharedWithEmail(e.target.value)}
            />
          </div>

          <div className={`flex items-center gap-4 p-5 rounded-[1.5rem] border group cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-900 ${isFixed ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800'}`} onClick={() => setIsFixed(!isFixed)}>
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center border-2 transition-all shadow-sm ${isFixed ? 'bg-cyan-600 border-cyan-600 dark:bg-cyan-500 dark:border-cyan-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
              {isFixed && <Check className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1">
              <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">Lançamento Recorrente</span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">{isFixed ? 'Ativado — repete todo mês' : 'Repetir todos os meses'}</p>
            </div>
            {isFixed && <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-500/20 px-3 py-1 rounded-full">Ativo</span>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-5 rounded-[1.5rem] text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-[0.98] mt-6 disabled:opacity-60 disabled:cursor-not-allowed ${type === 'EXPENSE' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : type === 'INCOME' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-sky-600 hover:bg-sky-700 shadow-sky-600/20'}`}
          >
            {isSubmitting ? 'Salvando...' : editingTransaction ? 'Salvar Alterações' :
              type === 'TRANSFER' ? 'Confirmar Transferência' :
                `Confirmar ${type === 'EXPENSE' ? 'Despesa' : 'Receita'}`}
          </button>
        </form>
      </div>
    </div>
  );
};
