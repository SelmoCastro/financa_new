/**
 * Tela principal do frontend para Budgets; reúne estado visual, ações do usuário e composição de componentes.
 */
import React, { useState, useEffect } from "react";
import api from "../services/api";
import { getCategoryEmoji } from "../utils/categoryIcons";
import { useToast } from "../context/ToastContext";
import { useData } from "../context/DataProvider";
import { useMonth } from "../context/MonthContext";
import { useCurrency } from "../context/CurrencyContext";
import { ReadOnlyBadge } from "../components/ReadOnlyBadge";
import { parseFlexibleCurrency } from "../utils/currency";
import { formatCurrencyInput } from "../utils/currencyInput";
import { useExceeding } from "../context/ExceedingContext";
import { useLanguage } from "../context/LanguageContext";
import { Plus, PiggyBank, Edit3, Trash2, X, ChevronDown } from "lucide-react";

interface Budget {
  id: string;
  amount: number;
  categoryId: string;
  categoryObj: { id: string; name: string; icon: string; color?: string };
  spent: number;
  percentage: number;
  isOverBudget: boolean;
}

interface BudgetsViewProps {
  isPrivacyEnabled: boolean;
  userPlan: string;
  isLoading?: boolean;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  isPrivacyEnabled,
  userPlan,
  isLoading: isInitialLoading = false,
}) => {
  const { categories } = useData();
  const { selectedDate } = useMonth();
  const { addToast } = useToast();
  const { formatCurrency, currencySymbol, locale } = useCurrency(); // Component State
  const { isExceeding } = useExceeding();
  const { t } = useLanguage();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ categoryId: "", amount: "" });
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const isBudgetLimitReached = userPlan !== "premium" && budgets.length >= 3;

  const showBudgetLimitNotice = () => {
    addToast(t("budgets.freeLimit"), "info");
  };

  const fetchBudgets = async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await api.get("/budgets", {
        params: {
          year: selectedDate.getFullYear(),
          month: selectedDate.getMonth(),
        },
      });
      setBudgets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      setBudgets([]);
      setLoadError(true);
      addToast(t("budgets.loadError"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [selectedDate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId || !form.amount) {
      addToast(t("budgets.fillAllFields"), "error");
      return;
    }

    try {
      const rawAmount = parseFlexibleCurrency(form.amount);

      if (isNaN(rawAmount) || rawAmount <= 0) {
        addToast(t("budgets.invalidAmount"), "info");
        return;
      }

      if (editingBudget) {
        await api.patch(`/budgets/${editingBudget.id}`, {
          categoryId: form.categoryId,
          amount: rawAmount,
        });
        addToast(t("budgets.updateSuccess"), "success");
      } else {
        if (isBudgetLimitReached) {
          showBudgetLimitNotice();
          return;
        }
        await api.post("/budgets", {
          categoryId: form.categoryId,
          amount: rawAmount,
        });
        addToast(t("budgets.saveSuccess"), "success");
      }

      setForm({ categoryId: "", amount: "" });
      setEditingBudget(null);
      setIsModalOpen(false);
      fetchBudgets(); // Refresh to ensure calculation is correct
    } catch (error: any) {
      console.error("Error saving budget:", error);
      const message = error.response?.data?.message || "";
      if (error.response?.status === 403) {
        addToast(`${message || t("budgets.freeLimit")} 🚀`, "error");
      } else {
        addToast(t("budgets.saveError"), "error");
      }
    }
  };

  const handleDelete = async (id: string, categoryName: string) => {
    if (
      !confirm(
        t("budgets.deleteConfirmWithCategory", { category: categoryName }),
      )
    )
      return;

    try {
      await api.delete(`/budgets/${id}`);
      addToast(t("budgets.deleteSuccess"), "success");
      fetchBudgets();
    } catch (error) {
      console.error("Error deleting budget:", error);
      addToast(t("budgets.deleteError"), "error");
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-rose-500";
    if (percentage >= 80) return "bg-amber-400";
    return "bg-emerald-500";
  };

  const openEditModal = (budget: Budget) => {
    setEditingBudget(budget);
    setForm({
      categoryId: budget.categoryId,
      amount: budget.amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">
            {t("budgets.planning")}
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            {t("budgets.title")}
          </h2>
        </div>
        <button
          onClick={() => {
            if (isBudgetLimitReached) {
              showBudgetLimitNotice();
              return;
            }
            setEditingBudget(null);
            setForm({ categoryId: "", amount: "" });
            setIsModalOpen(true);
          }}
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-cyan-600/20 transition-all active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {isBudgetLimitReached
            ? t("budgets.createMore")
            : t("budgets.newBudget")}
        </button>
      </div>

      {isBudgetLimitReached && (
        <div className="glass-card border border-amber-200 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-500/10 rounded-2xl sm:rounded-[2rem] p-4 sm:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 mb-1">
              {t("budgets.freeLimitTitle")}
            </p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {t("budgets.freeLimit")}
            </p>
          </div>
        </div>
      )}

      {isLoading || isInitialLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map((item) => (
            <div
              key={item}
              className="glass-card p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] animate-pulse"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-3 flex-1 mr-4">
                  <div className="h-6 w-40 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="h-10 w-20 bg-slate-100 dark:bg-slate-800 rounded-2xl"></div>
                  <div className="text-right space-y-2">
                    <div className="h-3 w-14 bg-slate-100 dark:bg-slate-800 rounded-full ml-auto"></div>
                    <div className="h-6 w-24 bg-slate-100 dark:bg-slate-800 rounded-full ml-auto"></div>
                  </div>
                </div>
              </div>
              <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
              <div className="flex justify-between mt-4">
                <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="text-center py-16 sm:py-20 glass-card rounded-2xl sm:rounded-[2.5rem] border-dashed border-rose-200 dark:border-rose-500/20">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
            <X className="w-10 h-10 text-rose-400 dark:text-rose-300" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-black text-xl mb-2">
            {t("budgets.loadError")}
          </h3>
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-16 sm:py-20 glass-card rounded-2xl sm:rounded-[2.5rem] border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm">
            <PiggyBank className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-black text-xl mb-2">
            {t("budgets.noBudgets")}
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xs mx-auto">
            {t("budgets.noBudgetsDesc")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {budgets.map((budget) => (
            <div
              key={budget.categoryId}
              className="glass-card p-4 sm:p-8 rounded-2xl sm:rounded-[2.5rem] relative overflow-hidden group hover:translate-y-[-4px] transition-all duration-300"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1 min-w-0 flex-1 mr-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-800 dark:text-white text-xl tracking-tight truncate">
                      {budget.categoryObj?.name || t("budgets.category")}
                    </h3>
                    <ReadOnlyBadge type="budget" id={budget.id} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {t("budgets.spent")}
                    </span>
                    <span
                      className={`text-sm font-black ${budget.isOverBudget ? "text-rose-500" : "text-slate-600 dark:text-slate-300"} ${isPrivacyEnabled ? "blur-sm select-none" : ""}`}
                    >
                      {isPrivacyEnabled ? "••••" : formatCurrency(budget.spent)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(budget)}
                      disabled={isExceeding("budget", budget.id)}
                      className={`p-2 text-slate-400 hover:text-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 rounded-xl transition-all ${isExceeding("budget", budget.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                      title={
                        isExceeding("budget", budget.id)
                          ? t("budgets.readOnlyMode")
                          : t("budgets.editBudget")
                      }
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(
                          budget.id,
                          budget.categoryObj?.name || t("budgets.category"),
                        )
                      }
                      disabled={isExceeding("budget", budget.id)}
                      className={`p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all ${isExceeding("budget", budget.id) ? "opacity-50 cursor-not-allowed" : ""}`}
                      title={
                        isExceeding("budget", budget.id)
                          ? t("budgets.readOnlyMode")
                          : t("budgets.deleteBudget")
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mb-0.5">
                      {t("budgets.amount")}
                    </p>
                    <p
                      className={`text-xl font-black text-cyan-600 dark:text-cyan-400 tracking-tight ${isPrivacyEnabled ? "blur-sm select-none" : ""}`}
                    >
                      {isPrivacyEnabled
                        ? "••••"
                        : formatCurrency(budget.amount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative h-4 w-full bg-slate-100 dark:bg-slate-900/50 rounded-full overflow-hidden p-1">
                <div
                  className={`h-full rounded-full ${getProgressColor(budget.percentage)} transition-all duration-1000 ease-out shadow-sm`}
                  style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                ></div>
              </div>

              <div className="flex justify-between mt-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${budget.isOverBudget ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`}
                  ></div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest ${budget.isOverBudget ? "text-rose-500" : "text-emerald-500"}`}
                  >
                    {budget.isOverBudget
                      ? t("budgets.overBudget")
                      : t("budgets.withinBudget")}
                  </span>
                </div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {budget.percentage.toFixed(1)}% {t("budgets.used")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                  {editingBudget
                    ? t("budgets.editBudget")
                    : t("budgets.newBudget")}
                </h3>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                  {t("budgets.planYourExpenses")}
                </p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingBudget(null);
                }}
                className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                  {t("budgets.category")}
                </label>
                <div className="relative">
                  <select
                    value={form.categoryId}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setForm({ ...form, categoryId: selectedId });
                    }}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl font-bold text-slate-700 dark:text-white focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none appearance-none cursor-pointer transition-all"
                  >
                    <option value="">{t("budgets.selectCategory")}</option>

                    <optgroup label={t("budgets.incomeGroup")}>
                      {categories
                        .filter((c) => c.type === "INCOME")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {getCategoryEmoji(c.icon)} {c.name}
                          </option>
                        ))}
                    </optgroup>

                    <optgroup label={t("budgets.needsGroup")}>
                      {categories
                        .filter((c) =>
                          [
                            "Moradia",
                            "Contas Residenciais",
                            "Mercado / Padaria",
                            "Transporte Fixo",
                            "Combustível / Gasolina",
                            "Saúde e Farmácia",
                            "Educação",
                            "Impostos Anuais e Seguros",
                            "Impostos Mensais",
                          ].includes(c.name),
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {getCategoryEmoji(c.icon)} {c.name}
                          </option>
                        ))}
                    </optgroup>

                    <optgroup label={t("budgets.wantsGroup")}>
                      {categories
                        .filter((c) =>
                          [
                            "Restaurante / Delivery",
                            "Transporte App",
                            "Lazer / Assinaturas",
                            "Compras / Vestuário",
                            "Cuidados Pessoais",
                            "Cuidados com Pets",
                            "Viagens",
                          ].includes(c.name),
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {getCategoryEmoji(c.icon)} {c.name}
                          </option>
                        ))}
                    </optgroup>

                    <optgroup label={t("budgets.goalsGroup")}>
                      {categories
                        .filter((c) =>
                          [
                            "Aplicações / Poupança",
                            "Pagamento de Dívidas",
                          ].includes(c.name),
                        )
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {getCategoryEmoji(c.icon)} {c.name}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                  {t("budgets.desiredMonthlyLimit")}
                </label>
                <div className="relative group">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-black text-lg pointer-events-none group-focus-within:text-cyan-500 transition-colors">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.amount}
                    onChange={(e) => {
                      const formatted = formatCurrencyInput(
                        e.target.value,
                        locale,
                      );
                      setForm({ ...form, amount: formatted });
                    }}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none transition-all font-black text-slate-800 dark:text-white text-2xl tracking-tight"
                    placeholder="0,00"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black uppercase tracking-widest text-xs py-5 rounded-2xl mt-4 transition-all active:scale-95 shadow-xl shadow-cyan-600/20"
              >
                {editingBudget
                  ? t("budgets.updateBudget")
                  : t("budgets.saveBudget")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
