import React, { useState, useEffect } from 'react';
import { recurringService, RecurringTransactionDTO, WeightData } from '../services/recurringService';
import { useData } from '../context/DataProvider';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { Skeleton } from '../components/Skeleton';
import { Plus, Edit3, Trash2, X, ChevronDown, Calendar } from 'lucide-react';

export const RecurringView: React.FC = () => {
  const { accounts, categories, refreshData } = useData();
  const { formatCurrency } = useCurrency();
  const { addToast } = useToast();

  const [recorrentes, setRecorrentes] = useState<RecurringTransactionDTO[]>([]);
  const [weight, setWeight] = useState<WeightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransactionDTO | null>(null);
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE',
    dueDay: '1',
    categoryId: '',
    accountId: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rtRes, wRes] = await Promise.all([
        recurringService.getAll(),
        recurringService.getWeight(),
      ]);
      setRecorrentes(rtRes.data);
      setWeight(wRes.data);
    } catch (err: any) {
      addToast('Erro ao carregar recorrentes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditingRecurring(null);
    setForm({ description: '', amount: '', type: 'EXPENSE', dueDay: '1', categoryId: '', accountId: '' });
    setIsFormOpen(true);
  };

  const openEdit = (r: RecurringTransactionDTO) => {
    setEditingRecurring(r);
    setForm({
      description: r.description,
      amount: String(r.amount),
      type: r.type,
      dueDay: String(r.dueDay),
      categoryId: r.categoryId || '',
      accountId: r.accountId || '',
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.description || !form.amount) {
      addToast('Preencha descrição e valor', 'error');
      return;
    }
    try {
      const payload = {
        description: form.description,
        amount: Number(form.amount),
        type: form.type,
        dueDay: Number(form.dueDay),
        categoryId: form.categoryId || null,
        accountId: form.accountId || null,
      };
      if (editingRecurring) {
        await recurringService.update(editingRecurring.id, payload);
        addToast('Recorrente atualizado!', 'success');
      } else {
        await recurringService.create(payload);
        addToast('Recorrente criado!', 'success');
      }
      setIsFormOpen(false);
      fetchData();
      refreshData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || 'Erro ao salvar', 'error');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await recurringService.toggle(id);
      fetchData();
      refreshData();
    } catch (err: any) {
      addToast('Erro ao alternar status', 'error');
    }
  };

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Excluir "${description}"?`)) return;
    try {
      await recurringService.remove(id);
      addToast('Recorrente removido', 'info');
      fetchData();
      refreshData();
    } catch (err: any) {
      addToast('Erro ao excluir', 'error');
    }
  };

  // ── Weight bar color ──
  const pct = weight?.weight || 0;
  const barColor = pct > 50 ? 'bg-rose-500' : pct > 30 ? 'bg-amber-500' : 'bg-emerald-500';

  const filteredCategories = categories.filter(c => c.type === form.type);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* ── Weight Card ── */}
      {weight && (
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            💰 Comprometimento da Renda
          </p>
          <div className="flex items-end justify-between gap-4 mb-4">
            <span className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
              {pct}%
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium text-right">
              {formatCurrency(weight.totalFixedExpense)} de {formatCurrency(weight.monthlyIncome)}
            </span>
          </div>
          <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {weight.count} {weight.count === 1 ? 'despesa recorrente ativa' : 'despesas recorrentes ativas'}
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
          Despesas Recorrentes
        </h3>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-700 transition-all active:scale-95 shadow-lg shadow-cyan-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" /> Novo Recorrente
        </button>
      </div>

      {/* ── List ── */}
      {recorrentes.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center opacity-50">
          <div className="text-4xl mb-4">📌</div>
          <p className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Nenhuma despesa recorrente cadastrada
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Clique em "Novo Recorrente" para começar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recorrentes.map((r) => (
            <div
              key={r.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-4 md:p-5 flex items-center gap-4 transition-all ${
                r.isActive
                  ? 'border-slate-200 dark:border-slate-800 shadow-sm'
                  : 'border-slate-100 dark:border-slate-800/50 opacity-50'
              }`}
            >
              <div className="text-2xl flex-shrink-0">
                {r.category?.icon || (r.type === 'INCOME' ? '💰' : '📌')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                  {r.description}
                </p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span
                    className={`font-black text-base tracking-tight ${
                      r.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrency(Number(r.amount))}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Dia {r.dueDay}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggle(r.id)}
                  title={r.isActive ? 'Desativar' : 'Ativar'}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-lg"
                >
                  {r.isActive ? '✅' : '⭕'}
                </button>
                <button
                  onClick={() => openEdit(r)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-cyan-600"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(r.id, r.description)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-cyan-50/50 dark:bg-slate-950/50 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {editingRecurring ? 'Editar Recorrente' : 'Novo Recorrente'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Descrição</label>
                <input
                  type="text"
                  className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                  placeholder="Ex: Aluguel"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Type + Amount row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Tipo</label>
                  <div className="relative">
                    <select
                      className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none cursor-pointer"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value, categoryId: '' })}
                    >
                      <option value="EXPENSE">Despesa</option>
                      <option value="INCOME">Receita</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>

              {/* Due day */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Dia do Vencimento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                  value={form.dueDay}
                  onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Categoria</label>
                <div className="relative">
                  <select
                    className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none cursor-pointer"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">Nenhuma</option>
                    {filteredCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Account */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Conta</label>
                <div className="relative">
                  <select
                    className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none cursor-pointer"
                    value={form.accountId}
                    onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  >
                    <option value="">Nenhuma</option>
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setIsFormOpen(false)}
                className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                className="flex-[2] py-3 text-[10px] font-black uppercase tracking-widest bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all active:scale-95 shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2"
              >
                {editingRecurring ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
