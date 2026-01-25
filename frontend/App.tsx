
import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Transaction, TransactionType } from './types';
import { StatCard } from './components/StatCard';
import { TransactionForm } from './components/TransactionForm';
import { Sidebar } from './components/Sidebar';
import api from './services/api';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userName, setUserName] = useState(localStorage.getItem('userName') || 'Usuário');
  const navigate = useNavigate();

  // States for History Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions');
      // Ensure date strings are handled correctly if needed, though API returns ISO strings which work with new Date()
      setTransactions(response.data);
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      if ((error as any).response?.status === 401) {
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // @ts-ignore
    if (window.lucide) {
      // @ts-ignore
      window.lucide.createIcons();
    }
  }, [activeTab, sidebarOpen, isFormOpen, transactions, filterType, editingTransaction, userName]);

  const totals = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const current = { income: 0, expense: 0 };
    const previous = { income: 0, expense: 0 };
    const overall = { income: 0, expense: 0 };

    transactions.forEach(t => {
      const amount = Number(t.amount);
      const date = new Date(t.date);
      const tMonth = date.getMonth();
      const tYear = date.getFullYear();

      // Overall totals (for Balance)
      if (t.type === 'INCOME') overall.income += amount;
      else overall.expense += amount;

      // Current Month
      if (tMonth === currentMonth && tYear === currentYear) {
        if (t.type === 'INCOME') current.income += amount;
        else current.expense += amount;
      }

      // Previous Month
      if (tMonth === previousMonth && tYear === previousYear) {
        if (t.type === 'INCOME') previous.income += amount;
        else previous.expense += amount;
      }
    });

    const calculateVariation = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      income: overall.income,
      expense: overall.expense,
      balance: overall.income - overall.expense,
      currentIncome: current.income,
      currentExpense: current.expense,
      incomeTrend: calculateVariation(current.income, previous.income),
      expenseTrend: calculateVariation(current.expense, previous.expense)
    };
  }, [transactions]);


  const rule503020 = useMemo(() => {
    const needsCategories = ['Moradia', 'Alimentação', 'Saúde', 'Transporte', 'Educação', 'Contas e Serviços'];
    const wantsCategories = ['Lazer', 'Outros', 'Compras', 'Restaurantes', 'Assinaturas', 'Viagem', 'Cuidados Pessoais', 'Presentes'];
    const savingsCategories = ['Investimentos (Aporte)', 'Dívidas/Financiamentos'];

    let needs = 0;
    let wants = 0;
    let savings = 0;

    transactions.forEach(t => {
      // Only count expenses (negative flows) or specific savings flows
      // Note: Savings might be negative (expense) or transfer. Assuming Expense for Investimentos in this simple model if it's money leaving main account to broker, or specific category logic. 
      // Actually, typically 'Investimentos' is an 'EXPENSE' in terms of cash flow out of checking, or 'INCOME' if selling. 
      // Let's assume all 'EXPENSE' types are relevant, plus we need to see how to handle 'Investimentos'.
      // If the user categorized 'Investimentos' as EXPENSE (buying stock), it goes to savings bucket.

      if (t.type === 'EXPENSE') {
        const amount = Number(t.amount);
        if (needsCategories.includes(t.category)) {
          needs += amount;
        } else if (wantsCategories.includes(t.category)) {
          wants += amount;
        } else if (savingsCategories.includes(t.category)) {
          savings += amount;
        } else {
          // Default to wants if unknown
          wants += amount;
        }
      }
    });

    const totalIncome = totals.income || 1; // Avoid division by zero

    return {
      needs: { value: needs, percent: (needs / totalIncome) * 100, target: 50 },
      wants: { value: wants, percent: (wants / totalIncome) * 100, target: 30 },
      savings: { value: savings, percent: (savings / totalIncome) * 100, target: 20 }
    };
  }, [transactions, totals.income]);

  const forecast = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthKey = `${currentYear}-${currentMonth}`;

    // 1. Identify all UNIQUE fixed transactions from history
    const fixedDefinitions: Record<string, { amount: number, type: 'INCOME' | 'EXPENSE', day: number, lastSeen: string }> = {};

    transactions.filter(t => t.isFixed).forEach(t => {
      // Key by description (simple heuristic)
      // Improve: normalize description
      const key = t.description.toLowerCase().trim();
      const d = new Date(t.date);
      // Only keep the latest occurrence's amount/day
      // We assume the most recent one is the most accurate
      fixedDefinitions[key] = {
        amount: Number(t.amount),
        type: t.type,
        day: d.getDate(), // Day of month it usually happens
        lastSeen: `${d.getFullYear()}-${d.getMonth()}`
      };
    });

    // 2. Check which ones are MISSING in the current month
    const missingFixed: { description: string, amount: number, type: 'INCOME' | 'EXPENSE' }[] = [];

    Object.entries(fixedDefinitions).forEach(([desc, def]) => {
      // Check if this description exists in current month transactions
      const existsInCurrent = transactions.some(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear &&
          t.description.toLowerCase().trim() === desc;
      });

      if (!existsInCurrent) {
        // It's missing! Add to forecast
        missingFixed.push({
          description: desc.charAt(0).toUpperCase() + desc.slice(1),
          amount: def.amount,
          type: def.type
        });
      }
    });

    // 3. Calculate Projected Balance
    let projectedBalance = totals.balance;
    missingFixed.forEach(item => {
      if (item.type === 'INCOME') projectedBalance += item.amount;
      else projectedBalance -= item.amount;
    });

    return {
      projectedBalance,
      missingFixed
    };
  }, [transactions, totals.balance]);


  const categorySummary = useMemo(() => {
    const categories: Record<string, number> = {};
    transactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category)));
  }, [transactions]);

  const filteredHistory = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || tx.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, filterType]);

  const transactionsGroupedByDate = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groups: Record<string, Transaction[]> = {};

    sorted.forEach(t => {
      const dateKey = t.date.toString().split('T')[0]; // Extract YYYY-MM-DD
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    return Object.entries(groups).map(([date, txs]) => ({
      date,
      transactions: txs
    }));
  }, [transactions]);

  const monthlyChartData = useMemo(() => {
    // 1. Group by Year-Month (e.g., "2024-05")
    const groupedByMonth: Record<string, { income: number; expenses: number }> = {};

    transactions.forEach(t => {
      const date = new Date(t.date);
      // Ensure we use local time or simplified ISO date to avoid timezone issues
      // Using slice(0, 7) on ISO string works if dates are consistent YYYY-MM-DD
      const monthKey = t.date.toString().substring(0, 7);

      if (!groupedByMonth[monthKey]) {
        groupedByMonth[monthKey] = { income: 0, expenses: 0 };
      }

      if (t.type === 'INCOME') {
        groupedByMonth[monthKey].income += Number(t.amount);
      } else {
        groupedByMonth[monthKey].expenses += Number(t.amount);
      }
    });

    // 2. Sort keys and map to array
    const sortedDirectKeys = Object.keys(groupedByMonth).sort();

    // If no data, show at least current month empty? Or just return empty
    if (sortedDirectKeys.length === 0) return [];

    return sortedDirectKeys.map(key => {
      const [year, month] = key.split('-');
      // Format month name (e.g. "Mai")
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' });
      // Capitalize first letter
      const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

      return {
        month: formattedMonth,
        income: groupedByMonth[key].income,
        expenses: groupedByMonth[key].expenses
      };
    });
  }, [transactions]);

  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    try {
      const response = await api.post('/transactions', newTx);
      setTransactions(prev => [response.data, ...prev]);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Erro ao adicionar:', error);
      alert('Erro ao salvar transação');
    }
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    try {
      const { id, ...data } = updatedTx;
      const response = await api.patch(`/transactions/${id}`, data);
      // The backend might return count, so we update local state optimally or refetch
      // Usually simpler to just update local state if we trust the input
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
      setEditingTransaction(null);
      setIsFormOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar transação');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      try {
        await api.delete(`/transactions/${id}`);
        setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (error) {
        console.error('Erro ao deletar:', error);
        alert('Erro ao deletar transação');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  const handleResetApp = async () => {
    alert('Esta funcionalidade não está disponível na versão com Banco de Dados para sua segurança.');
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'finanza-backup.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const openEditForm = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTransaction(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <StatCard title="Saldo Total" value={`R$ ${totals.balance.toLocaleString('pt-BR')}`} color="bg-indigo-50 text-indigo-600" icon={<i data-lucide="banknote"></i>} />
              <StatCard
                title="Entradas (Mês)"
                value={`R$ ${totals.currentIncome.toLocaleString('pt-BR')}`}
                color="bg-emerald-50 text-emerald-600"
                icon={<i data-lucide="trending-up"></i>}
                trend={`${Math.abs(totals.incomeTrend).toFixed(1)}%`}
                trendUp={totals.incomeTrend >= 0}
              />
              <StatCard
                title="Saídas (Mês)"
                value={`R$ ${totals.currentExpense.toLocaleString('pt-BR')}`}
                color="bg-rose-50 text-rose-600"
                icon={<i data-lucide="trending-down"></i>}
                trend={`${Math.abs(totals.expenseTrend).toFixed(1)}%`}
                trendUp={totals.expenseTrend <= 0}
              />
              <StatCard title="Saving Rate" value={`${totals.income > 0 ? ((totals.balance / totals.income) * 100).toFixed(1) : 0}%`} color="bg-amber-50 text-amber-600" icon={<i data-lucide="activity"></i>} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              <div className="lg:col-span-8 space-y-6 md:space-y-8">
                <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-slate-800">Performance Mensal</h3>
                    <p className="text-sm text-slate-500">Fluxo consolidado de caixa</p>
                  </div>
                  <div className="h-[250px] md:h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyChartData}>
                        <defs>
                          <linearGradient id="gradInc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                          <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} /><stop offset="95%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dx={-5} />
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} />
                        <Legend verticalAlign="top" height={36} iconType="circle" />
                        <Area name="Receitas" type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} fill="url(#gradInc)" />
                        <Area name="Despesas" type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={3} fill="url(#gradExp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    {forecast.missingFixed.length > 0 ? (
                      <>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Fixos Pendentes</h3>
                        <div className="space-y-3">
                          {forecast.missingFixed.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <span className="text-xs font-bold text-slate-700">{item.description}</span>
                              <span className={`text-xs font-black ${item.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {item.type === 'INCOME' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3">
                          <i data-lucide="check-circle" className="w-6 h-6"></i>
                        </div>
                        <p className="text-sm font-bold text-slate-600">Tudo em dia!</p>
                        <p className="text-[10px] text-slate-400">Nenhuma conta fixa pendente.</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
                    <div className="text-center space-y-2 mb-6">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Ticket Médio</p>
                      <h4 className="text-3xl font-black text-slate-800">R$ {(totals.expense / (transactions.filter(t => t.type === 'EXPENSE').length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                      <div className="text-center"><p className="text-[10px] font-bold text-slate-400 uppercase">Total Transações</p><p className="text-lg font-black text-slate-700">{transactions.length}</p></div>
                      <div className="text-center border-l border-slate-100"><p className="text-[10px] font-bold text-slate-400 uppercase">Maior Gasto</p><p className="text-lg font-black text-rose-500">R$ {Math.max(...transactions.filter(t => t.type === 'EXPENSE').map(t => Number(t.amount)), 0).toLocaleString('pt-BR')}</p></div>
                    </div>
                  </div>
                </div>
              </div>


              <div className="lg:col-span-4 space-y-6 md:space-y-8">
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Regra 50/30/20</h3>
                      <p className="text-sm text-slate-500">Saúde Financeira</p>
                    </div>
                    <div className="p-2 bg-indigo-50 rounded-lg">
                      <i data-lucide="pie-chart" className="w-5 h-5 text-indigo-600"></i>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Needs */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-600">Necessidades (50%)</span>
                        <span className="font-black text-slate-800">{rule503020.needs.percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${rule503020.needs.percent > 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(rule503020.needs.percent, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">
                        R$ {rule503020.needs.value.toLocaleString('pt-BR')} gastos
                      </p>
                    </div>

                    {/* Wants */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-600">Desejos (30%)</span>
                        <span className="font-black text-slate-800">{rule503020.wants.percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${rule503020.wants.percent > 30 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                          style={{ width: `${Math.min(rule503020.wants.percent, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">
                        R$ {rule503020.wants.value.toLocaleString('pt-BR')} gastos
                      </p>
                    </div>

                    {/* Savings */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-bold text-slate-600">Objetivos (20%)</span>
                        <span className="font-black text-slate-800">{rule503020.savings.percent.toFixed(1)}%</span>
                      </div>
                      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${Math.min(rule503020.savings.percent, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">
                        R$ {rule503020.savings.value.toLocaleString('pt-BR')} reservados
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-6">Alocação de Recursos</h3>
                  <div className="h-64 relative mx-auto">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={categorySummary} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                          {categorySummary.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Despesas</span>
                      <span className="text-lg font-black text-slate-800">100%</span>
                    </div>
                  </div>
                  <div className="mt-8 space-y-4">
                    {categorySummary.slice(0, 5).map((item, idx) => (
                      <div key={item.name} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                          <span className="text-sm font-bold text-slate-600 truncate max-w-[120px]">{item.name}</span>
                        </div>
                        <span className="text-sm font-black text-slate-800">R$ {item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'timeline':
        return (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-700">
            <div className="text-center space-y-2">
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Caminho Financeiro</h3>
              <p className="text-sm md:text-base text-slate-500 font-medium px-4">Sua jornada detalhada dia após dia</p>
            </div>
            <div className="relative px-2">
              <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 via-emerald-500 to-slate-200 -translate-x-1/2 rounded-full hidden md:block"></div>
              <div className="space-y-12 md:space-y-16">
                {transactionsGroupedByDate.map((group, groupIdx) => {
                  // Fix date parsing for timeline display
                  const dateObj = new Date(group.date + 'T12:00:00'); // Adding time to avoid timezone shifts on date-only strings
                  const isEven = groupIdx % 2 === 0;
                  return (
                    <div key={group.date} className="relative">
                      <div className="sticky top-24 z-10 flex md:justify-center mb-6 md:mb-8">
                        <div className="bg-slate-900 text-white px-5 py-2 rounded-full font-black text-[10px] md:text-xs uppercase tracking-[0.2em] shadow-xl ring-4 ring-white">
                          {dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="space-y-4">
                        {group.transactions.map((tx) => (
                          <div key={tx.id} className={`flex flex-col md:flex-row items-center gap-4 md:gap-8 ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                            <div className="w-full md:w-1/2 pl-12 md:pl-0">
                              <div className={`bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${isEven ? 'md:mr-auto' : 'md:ml-auto'}`}>
                                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${tx.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                <div className="flex justify-between items-start gap-2">
                                  <div className="space-y-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest truncate">{tx.category}</p>
                                      {tx.isFixed && <i data-lucide="repeat" className="w-3 h-3 text-indigo-400"></i>}
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-base md:text-lg group-hover:text-indigo-600 transition-colors truncate">{tx.description}</h4>
                                  </div>
                                  <p className={`font-black text-base md:text-lg whitespace-nowrap ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800'}`}>
                                    {tx.type === 'INCOME' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="absolute left-8 md:left-1/2 w-3 h-3 md:w-4 md:h-4 rounded-full bg-white border-2 md:border-4 border-indigo-500 -translate-x-1/2 z-0 hidden md:block"></div>
                            <div className="hidden md:block w-1/2"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 'recent':
        return (
          <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-xl font-black text-slate-800">Gerenciar Lançamentos</h3>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">{transactions.length} registros</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-white p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${tx.type === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 md:gap-5 min-w-0">
                      <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex-shrink-0 flex items-center justify-center text-lg md:text-xl ${tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        <i data-lucide={tx.type === 'INCOME' ? 'arrow-up-right' : 'arrow-down-left'} className="w-5 h-5 md:w-6 md:h-6"></i>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-base md:text-lg group-hover:text-indigo-600 transition-colors truncate">{tx.description}</p>
                          {tx.isFixed && <i data-lucide="repeat" className="w-3.5 h-3.5 text-indigo-400"></i>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] md:text-[10px] uppercase font-black tracking-widest text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg truncate">{tx.category}</span>
                          <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className={`font-black text-base md:text-xl ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800'}`}>
                        {tx.type === 'INCOME' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR')}
                      </p>
                      <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => openEditForm(tx)} className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"><i data-lucide="edit-3" className="w-4 h-4"></i></button>
                        <button onClick={() => handleDeleteTransaction(tx.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-right duration-500">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-800">Configurações do Perfil</h3>
                <p className="text-sm text-slate-500 font-medium">Gerencie seus dados e preferências do sistema</p>
              </div>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome de Exibição</label>
                    <div className="relative">
                      <i data-lucide="user" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                      <input
                        type="text"
                        value={userName}
                        readOnly
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-bold text-slate-700 cursor-not-allowed opacity-70"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Moeda Padrão</label>
                    <div className="relative">
                      <i data-lucide="banknote" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                      <select className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none appearance-none font-bold text-slate-700">
                        <option>Real Brasileiro (BRL)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Gestão de Dados</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={handleExportData}
                      className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-[1.5rem] hover:bg-slate-50 transition-all group"
                    >
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i data-lucide="download"></i>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-slate-800 text-sm">Exportar Dados</p>
                        <p className="text-[10px] text-slate-500 font-medium">Baixar backup em JSON</p>
                      </div>
                    </button>
                    <button
                      onClick={handleResetApp}
                      className="flex items-center gap-4 p-5 bg-rose-50/30 border border-rose-100 rounded-[1.5rem] hover:bg-rose-50 transition-all group opacity-50 cursor-not-allowed"
                    >
                      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i data-lucide="refresh-cw"></i>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-rose-700 text-sm">Resetar Sistema</p>
                        <p className="text-[10px] text-rose-500 font-medium">Desativado (Web)</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da Conta
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white shadow-xl overflow-hidden relative group">
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <i data-lucide="info" className="w-8 h-8 text-indigo-300"></i>
                </div>
                <div className="text-center md:text-left space-y-1">
                  <h4 className="text-lg font-black">Finanza Lite v1.0.4</h4>
                  <p className="text-xs text-indigo-200 font-medium">Plataforma de código aberto focada em privacidade e simplicidade.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-5 md:p-8 border-b border-slate-100 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-center sm:text-left w-full sm:w-auto">
                    <h3 className="text-lg md:text-xl font-bold text-slate-800">Extrato Consolidado</h3>
                    <p className="text-xs md:text-sm text-slate-500 font-medium">Análise granular e filtros</p>
                  </div>
                  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
                    {['ALL', 'INCOME', 'EXPENSE'].map((type) => (
                      <button key={type} onClick={() => setFilterType(type as any)} className={`flex-1 sm:flex-none px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${filterType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                        {type === 'ALL' ? 'Todos' : type === 'INCOME' ? 'Ganhos' : 'Gastos'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative w-full">
                  <i data-lucide="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                  <input type="text" placeholder="Filtrar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-slate-50 text-slate-400 text-[9px] md:text-[10px] uppercase font-black tracking-[0.15em]">
                    <tr><th className="px-6 md:px-8 py-5 text-left">Item</th><th className="px-6 md:px-8 py-5 text-left hidden sm:table-cell">Categoria</th><th className="px-6 md:px-8 py-5 text-left hidden md:table-cell">Data</th><th className="px-6 md:px-8 py-5 text-right">Valor</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map((tx) => (
                      <tr key={tx.id} className="hover:bg-indigo-50/20 transition-colors group text-sm md:text-base">
                        <td className="px-6 md:px-8 py-5 md:py-6">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${tx.type === 'INCOME' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-700 truncate block">{tx.description}</span>
                              <span className="text-[10px] text-slate-400 md:hidden">{tx.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 md:px-8 py-5 md:py-6 hidden sm:table-cell"><span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-tighter">{tx.category}</span></td>
                        <td className="px-6 md:px-8 py-5 md:py-6 text-sm font-bold text-slate-400 hidden md:table-cell">{new Date(tx.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                        <td className={`px-6 md:px-8 py-5 md:py-6 text-right font-black ${tx.type === 'INCOME' ? 'text-emerald-500' : 'text-slate-800'}`}>{tx.type === 'INCOME' ? '+' : '-'} R$ {Number(tx.amount).toLocaleString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className={`flex-1 sidebar-transition ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} pb-24 lg:pb-0`}>
        <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-4 md:px-8 py-4 md:py-6 flex justify-between items-center">
          <div className="min-w-0">
            <p className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-0.5 truncate">Gestão Financeira</p>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight capitalize truncate">
              {activeTab === 'dashboard' ? 'Dashboard' : activeTab === 'timeline' ? 'Linha do Tempo' : activeTab === 'recent' ? 'Lançamentos' : activeTab === 'settings' ? 'Configurações' : 'Extrato'}
              {userName && (
                <span className="block text-xs text-indigo-600 font-bold mt-1">Olá, {userName}</span>
              )}
            </h2>
          </div>
          <button onClick={() => setIsFormOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-2 md:gap-3 flex-shrink-0">
            <i data-lucide="plus" className="w-4 h-4 md:w-5 md:h-5"></i>
            <span className="hidden sm:inline">Novo Lançamento</span>
          </button>
        </header>
        <main className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 md:py-10">
          {renderContent()}
        </main>
      </div>
      {isFormOpen && (
        <TransactionForm
          onAdd={handleAddTransaction}
          onUpdate={handleUpdateTransaction}
          onClose={closeForm}
          existingCategories={uniqueCategories}
          editingTransaction={editingTransaction}
        />
      )}
    </div>
  );
};

export default App;
