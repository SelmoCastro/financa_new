import React, { useState, useEffect } from 'react';
import { recurringService, RecurringTransactionDTO, WeightData } from '../services/recurringService';
import { getCategoryEmoji } from '../utils/categoryIcons';
import { useData } from '../context/DataProvider';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { Skeleton } from '../components/Skeleton';
import { Plus, Edit3, Trash2, X, ChevronDown, Calendar } from 'lucide-react';

export const RecurringView: React.FC<{ isPrivacyEnabled: boolean }> = ({ isPrivacyEnabled }) => {
  const { accounts, categories, refreshData } = useData();
  const { formatCurrency } = useCurrency();
  const { addToast } = useToast();
  const { t } = useLanguage();

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
      addToast(t('recurring.loadError'), 'error');
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
      addToast(t('recurring.saveError'), 'error');
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
        addToast(t('recurring.saveSuccess'), 'success');
      } else {
        await recurringService.create(payload);
        addToast(t('recurring.saveSuccess'), 'success');
      }
      setIsFormOpen(false);
      fetchData();
      refreshData();
    } catch (err: any) {
      addToast(err?.response?.data?.message || t('recurring.saveError'), 'error');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await recurringService.toggle(id);
      fetchData();
      refreshData();
    } catch (err: any) {
      addToast(t('recurring.saveError'), 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('recurring.deleteConfirm'))) return;
    try {
      await recurringService.remove(id);
      addToast(t('recurring.deleteSuccess'), 'info');
      fetchData();
      refreshData();
    } catch (err: any) {
      addToast(t('recurring.deleteError'), 'error');
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
            💰 {t('recurring.monthlyWeight')}
          </p>
          <div className="flex items-end justify-between gap-4 mb-4">
            <span className={`text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
              {isPrivacyEnabled ? '••••' : `${pct}%`}
            </span>
            <span className={`text-xs text-slate-400 dark:text-slate-500 font-medium text-right ${isPrivacyEnabled ? 'blur-sm select-none' : ''}`}>
              {isPrivacyEnabled ? '••••' : `${t('recurring.totalFixed')}: ${formatCurrency(weight.totalFixedExpense)} / ${formatCurrency(weight.monthlyIncome)}`}
            </span>
          </div>
          <div className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {t('common.entries', { count: weight.count })}
          </p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
            {t('recurring.title')}
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
            {t('recurring.subtitle')}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-cyan-700 transition-all active:scale-95 shadow-lg shadow-cyan-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" /> {t('recurring.newRecurring')}
        </button>
      </div>

      {/* ── List ── */}
      {recorrentes.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center opacity-50">
          <div className="text-4xl mb-4">📌</div>
          <p className="text-sm font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            {t('recurring.noRecurring')}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('recurring.noRecurringDesc')}</p>
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
                      isPrivacyEnabled ? 'blur-sm select-none' : (r.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                    }`}
                  >
                    {isPrivacyEnabled ? '••••' : formatCurrency(Number(r.amount))}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {t('recurring.dueDay')} {r.dueDay}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleToggle(r.id)}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-lg"
                >
                  {r.isActive ? '✅' : '⭕'}
                </button>
                <button
                  onClick={() => openEdit(r)}
                  aria-label={t('common.edit')}
                  className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-cyan-600"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(r.id)}
                  aria-label={t('common.delete')}
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
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-cyan-50/50 dark:bg-slate-950/50 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {editingRecurring ? t('recurring.editRecurring') : t('recurring.newRecurring')}
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
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">{t('recurring.description')}</label>
                <input
                  type="text"
                  className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                  placeholder={t('recurring.description')}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Type + Amount row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">{t('recurring.type')}</label>
                  <div className="relative">
                    <select
                      className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none cursor-pointer"
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value, categoryId: '' })}
                    >
                      <option value="EXPENSE">{t('recurring.typeExpense')}</option>
                      <option value="INCOME">{t('recurring.typeIncome')}</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">{t('recurring.amount')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white"
                    placeholder={t('recurring.amount')}
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>

              {/* Due day */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> {t('recurring.dueDay')}
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
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">{t('recurring.category')}</label>
                <div className="relative">
                  <select
                    className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none cursor-pointer"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  >
                    <option value="">{t('common.noData')}</option>
                    {filteredCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{getCategoryEmoji(cat.icon)} {cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Account */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">{t('recurring.account')}</label>
                <div className="relative">
                  <select
                    className="w-full p-3.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all font-bold text-sm text-slate-900 dark:text-white appearance-none cursor-pointer"
                    value={form.accountId}
                    onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  >
                    <option value="">{t('common.noData')}</option>
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                className="flex-[2] py-3 text-[10px] font-black uppercase tracking-widest bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all active:scale-95 shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2"
              >
                {editingRecurring ? t('common.save') : t('common.create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
