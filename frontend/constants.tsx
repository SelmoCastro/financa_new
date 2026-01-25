
import { Transaction, Budget, MonthlyData } from './types';

export const CATEGORIES = [
  // Receitas
  'Salário', 'Freelance', 'Investimentos (Receita)', 'Presentes', 'Outras Receitas',
  // Despesas Fixas (Necessidades)
  'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação', 'Contas e Serviços',
  // Despesas Variáveis (Desejos)
  'Lazer', 'Compras', 'Restaurantes', 'Assinaturas', 'Viagem', 'Cuidados Pessoais',
  // Investimentos/Dívidas
  'Investimentos (Aporte)', 'Dívidas/Financiamentos'
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'Salário Mensal', amount: 5000, date: '2024-05-01', category: 'Salário', type: 'INCOME' },
  { id: '2', description: 'Aluguel', amount: 1500, date: '2024-05-02', category: 'Moradia', type: 'EXPENSE' },
  { id: '3', description: 'Supermercado', amount: 600, date: '2024-05-05', category: 'Alimentação', type: 'EXPENSE' },
  { id: '4', description: 'Freelance Design', amount: 1200, date: '2024-05-10', category: 'Outros', type: 'INCOME' },
  { id: '5', description: 'Gasolina', amount: 300, date: '2024-05-12', category: 'Transporte', type: 'EXPENSE' },
  { id: '6', description: 'Restaurante Fim de Semana', amount: 250, date: '2024-05-15', category: 'Lazer', type: 'EXPENSE' },
];

export const MONTHLY_CHART_DATA: MonthlyData[] = [
  { month: 'Jan', income: 4500, expenses: 3200 },
  { month: 'Fev', income: 4800, expenses: 3500 },
  { month: 'Mar', income: 4200, expenses: 4000 },
  { month: 'Abr', income: 5500, expenses: 3800 },
  { month: 'Mai', income: 6200, expenses: 2650 },
];
