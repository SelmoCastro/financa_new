/**
 * Componente reutilizável do frontend; encapsula uma parte relevante da interface dentro do domínio de componentes reutilizáveis da interface.
 */
import React, { useState, useEffect } from "react";
import { X, Wallet, ChevronDown } from "lucide-react";
import api from "../services/api";
import { BANKS } from "../constants";
import { useCurrency } from "../context/CurrencyContext";
import { useToast } from "../context/ToastContext";
import { formatCurrencyInput } from "../utils/currencyInput";
import { parseFlexibleCurrency } from "../utils/currency";

interface AccountFormProps {
  accountToEdit?: any;
  onSave: () => void;
  onClose: () => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({
  accountToEdit,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(accountToEdit?.name || BANKS[0]);
  const [type, setType] = useState(accountToEdit?.type || "CHECKING");
  const [displayBalance, setDisplayBalance] = useState(() => {
    if (accountToEdit && accountToEdit.balance !== undefined) {
      const val = (accountToEdit.balance * 100).toFixed(0);
      const amount = parseInt(val) / 100;
      return amount.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const { addToast } = useToast();
  const { currencySymbol, locale } = useCurrency();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayBalance(formatCurrencyInput(e.target.value, locale));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const parsedBalance = parseFlexibleCurrency(displayBalance);

      if (accountToEdit) {
        await api.patch(`/accounts/${accountToEdit.id}`, {
          name,
          type,
          balance: parsedBalance,
        });
      } else {
        await api.post("/accounts", {
          name,
          type,
          balance: parsedBalance,
        });
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Erro ao salvar conta", error);
      const message = error.response?.data?.message || "";
      if (
        error.response?.status === 403 &&
        (message.includes("Limite") || message.includes("Plano Free"))
      ) {
        addToast(`${message} 🚀`, "error");
      } else {
        addToast("Erro ao salvar conta. Verifique os dados.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[200] flex items-center justify-center p-4 transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
        <div className="px-8 py-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-1">
              Patrimônio
            </p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-sm">
                <Wallet className="w-6 h-6" />
              </div>
              {accountToEdit ? "Editar Conta" : "Nova Conta"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-all active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              Instituição ou Local
            </label>
            <div className="relative group">
              <select
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none appearance-none cursor-pointer"
              >
                {BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
                  </option>
                ))}
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              Tipo de Conta
            </label>
            <div className="relative group">
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-5 py-4 text-slate-700 dark:text-white font-bold focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none appearance-none cursor-pointer transition-all"
              >
                <option value="CHECKING">Conta Corrente</option>
                <option value="SAVINGS">Conta Poupança</option>
                <option value="INVESTMENT">Corretora / Investimentos</option>
                <option value="CASH">Carteira (Dinheiro Físico)</option>
              </select>
              <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">
              Saldo Atual
            </label>
            <div className="relative group">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-black text-lg pointer-events-none group-focus-within:text-cyan-500 transition-colors">
                {currencySymbol}
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                value={displayBalance}
                onChange={handleBalanceChange}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl pl-14 pr-6 py-5 text-slate-800 dark:text-white font-black text-2xl tracking-tighter focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 transition-all outline-none"
                placeholder="0,00"
              />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 ml-1 font-medium uppercase tracking-tight">
              {accountToEdit
                ? "Corrija o saldo se digitou errado"
                : "Insira o saldo real disponível nesta conta agora."}
            </p>
          </div>

          <div className="pt-6 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-5 text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-5 text-white font-black uppercase tracking-widest text-[10px] bg-cyan-600 hover:bg-cyan-700 rounded-2xl shadow-xl shadow-cyan-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? "Processando..."
                : accountToEdit
                  ? "Salvar Alterações"
                  : "Criar Conta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
