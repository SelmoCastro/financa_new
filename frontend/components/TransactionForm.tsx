import React, { useState, useEffect } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { TransactionType, Transaction, Account, CreditCard, Category } from '../types';
import api from '../services/api';
import { toYYYYMMDD } from '../utils/dateUtils';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdate?: (transaction: Transaction) => void;
  onClose: () => void;
  existingCategories: string[];
  editingTransaction?: Transaction | null;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  onAdd,
  onUpdate,
  onClose,
  existingCategories,
  editingTransaction
}) => {
  const [description, setDescription] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(toYYYYMMDD(new Date()));
  const [isFixed, setIsFixed] = useState(false);

  // New States
  const [accountId, setAccountId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(true);

  const formatCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const amount = parseInt(digits) / 100;
    return amount.toLocaleString('pt-BR', {
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

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [accRes, cardsRes, catRes] = await Promise.all([
          api.get('/accounts'),
          api.get('/credit-cards'),
          api.get('/categories')
        ]);
        setAccounts(accRes.data);
        setCreditCards(cardsRes.data);
        setCategories(catRes.data);

        // Auto-select first account if available
        if (accRes.data.length > 0 && !editingTransaction) {
          setAccountId(accRes.data[0].id);
        }
      } catch (err) {
        console.error('Error fetching entities for form', err);
      } finally {
        setIsLoadingEntities(false);
      }
    };
    fetchEntities();
  }, [editingTransaction]);

  // Reset category if type changes and current category is no longer valid
  useEffect(() => {
    if (isLoadingEntities || !type || !categories.length) return;

    const currentCat = categories.find(c => c.id === categoryId);
    if (currentCat && currentCat.type !== type && currentCat.type !== 'TRANSFER') {
      setCategoryId('');
    }
  }, [type, categories, isLoadingEntities]);

  useEffect(() => {
    if (editingTransaction && !isLoadingEntities) {
      setDescription(editingTransaction.description);
      const initialValue = (editingTransaction.amount * 100).toString();
      setDisplayAmount(formatCurrency(initialValue));
      setType(editingTransaction.type);

      // Select correct IDs
      setCategoryId(editingTransaction.categoryId || '');
      setAccountId(editingTransaction.accountId || '');
      setCreditCardId(editingTransaction.creditCardId || '');

      setDate(toYYYYMMDD(editingTransaction.date));
      setIsFixed(!!editingTransaction.isFixed);
    }
  }, [editingTransaction, isLoadingEntities]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setDisplayAmount(formatCurrency(rawValue));
  };

  const handleSubmit = (e: React.FormEvent) => {
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
      isFixed
    };

    if (editingTransaction && onUpdate) {
      onUpdate({ ...transactionData, id: editingTransaction.id } as unknown as Transaction);
    } else {
      onAdd(transactionData as unknown as Omit<Transaction, 'id'>);
    }
  };





  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[999] p-4 animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="px-8 py-6 border-b border-slate-100/50 flex justify-between items-center bg-white/50">
          <div>
            <h2 className="font-black text-xl text-slate-900 tracking-tight">
              {editingTransaction ? 'Editar Lançamento' : 'Novo Lançamento'}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {editingTransaction ? 'Atualize as informações do registro' : 'Registre sua movimentação'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'EXPENSE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'INCOME' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setType('TRANSFER')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'TRANSFER' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Transf.
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descrição</label>
            <input
              autoFocus
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
              placeholder="Ex: Aluguel, Academia, Salário..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valor (R$)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-black text-slate-800"
                  value={displayAmount}
                  placeholder="0,00"
                  onChange={handleAmountChange}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
              <input
                type="date"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* New fields: Category, Account and Card */}
          <div className="space-y-4">
            {type !== 'TRANSFER' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoria (Opcional)</label>
                <div className="relative">
                  <select
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 appearance-none cursor-pointer"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    <option value="">Nenhuma / Outros</option>
                    {categories.filter(c => c.type === 'INCOME' || c.type === 'TRANSFER').length > 0 && type === 'INCOME' && (
                      <optgroup label="Entradas (Rendas)">
                        {categories.filter(c => c.type === 'INCOME' || c.type === 'TRANSFER').map(c => (
                          <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                        ))}
                      </optgroup>
                    )}

                    {type === 'EXPENSE' && (
                      <>
                        <optgroup label="Necessidades (Essencial)">
                          {categories.filter(c =>
                            ['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais']
                              .includes(c.name)
                          ).map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </optgroup>

                        <optgroup label="Desejos (Estilo de Vida)">
                          {categories.filter(c =>
                            ['Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Viagens']
                              .includes(c.name)
                          ).map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </optgroup>

                        <optgroup label="Objetivos (Quitação e Reserva)">
                          {categories.filter(c =>
                            ['Aplicações / Poupança', 'Pagamento de Dívidas']
                              .includes(c.name)
                          ).map(c => (
                            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                          ))}
                        </optgroup>

                        {categories.filter(c =>
                          !['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais',
                            'Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Viagens',
                            'Aplicações / Poupança', 'Pagamento de Dívidas'].includes(c.name) && (c.type === 'EXPENSE' || c.type === 'TRANSFER')
                        ).length > 0 && (
                            <optgroup label="Outras Despesas e Transferências">
                              {categories.filter(c =>
                                !['Moradia', 'Contas Residenciais', 'Mercado / Padaria', 'Transporte Fixo', 'Saúde e Farmácia', 'Educação', 'Impostos Anuais e Seguros', 'Impostos Mensais',
                                  'Restaurante / Delivery', 'Transporte App', 'Lazer / Assinaturas', 'Compras / Vestuário', 'Cuidados Pessoais', 'Viagens',
                                  'Aplicações / Poupança', 'Pagamento de Dívidas'].includes(c.name) && (c.type === 'EXPENSE' || c.type === 'TRANSFER')
                              ).map(c => (
                                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                              ))}
                            </optgroup>
                          )}
                      </>
                    )}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <i data-lucide="chevron-down" className="w-5 h-5"></i>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{type === 'TRANSFER' ? 'Conta de Origem' : 'Conta Financeira'}</label>
                <div className="relative">
                  <select
                    required
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 appearance-none cursor-pointer"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    <option value="" disabled>Selecione...</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  {type === 'TRANSFER' ? 'Conta de Destino' : 'Cartão de Crédito'}
                </label>
                <div className="relative">
                  {type === 'TRANSFER' ? (
                    <select
                      required
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 appearance-none cursor-pointer"
                      value={destinationAccountId}
                      onChange={(e) => setDestinationAccountId(e.target.value)}
                    >
                      <option value="" disabled>Selecione...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 appearance-none cursor-pointer"
                      value={creditCardId}
                      onChange={(e) => {
                        setCreditCardId(e.target.value);
                        if (e.target.value) {
                          // auto map account of credit card when selected
                          const selectedCard = creditCards.find(c => c.id === e.target.value);
                          if (selectedCard && selectedCard.accountId) {
                            setAccountId(selectedCard.accountId);
                          }
                        }
                      }}
                    >
                      <option value="">Nenhum (Débito)</option>
                      {creditCards.map(card => (
                        <option key={card.id} value={card.id}>{card.name}</option>
                      ))}
                    </select>
                  )}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 group cursor-pointer" onClick={() => setIsFixed(!isFixed)}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 transition-all ${isFixed ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200'}`}>
              {isFixed && <Check className="w-4 h-4 text-white" />}
            </div>
            <div className="flex-1">
              <span className="text-sm font-bold text-slate-700">Lançamento Fixo</span>
              <p className="text-[10px] text-slate-400 font-medium">Repetir automaticamente todos os meses</p>
            </div>
          </div>

          <button
            type="submit"
            className={`w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] mt-4 ${type === 'EXPENSE' ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' : type === 'INCOME' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-sky-500 hover:bg-sky-600 shadow-sky-500/20'}`}
          >
            {editingTransaction ? 'Salvar Alterações' :
              type === 'TRANSFER' ? 'Confirmar Transferência' :
                `Confirmar ${type === 'EXPENSE' ? 'Despesa' : 'Receita'}`}
          </button>
        </form>
      </div>
    </div>
  );
};
