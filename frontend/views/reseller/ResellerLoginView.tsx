/**
 * Tela principal do frontend para ResellerLogin; reúne estado visual, ações do usuário e composição de componentes.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Store } from 'lucide-react';
import resellerApi from '../../services/resellerApi';

export const ResellerLoginView: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await resellerApi.post('/reseller-portal/auth/login', { email, password });
      setSuccess('Login realizado com sucesso.');
      navigate('/revendedor/painel');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Não foi possível entrar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto rounded-[2rem] bg-cyan-600 text-white flex items-center justify-center shadow-2xl shadow-cyan-600/30 mb-6">
            <Store className="w-10 h-10" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-600 dark:text-cyan-400">Portal Revendedor</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white tracking-tight">Acesse sua operação</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Use a conta de revendedor criada no painel admin.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-100 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/20 px-4 py-4 text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-4 text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-4 text-base font-bold text-slate-800 dark:text-white outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" placeholder="revendedor@email.com" />
          </div>
          <div>
            <label className="mb-2 ml-1 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-4 text-base font-bold text-slate-800 dark:text-white outline-none transition-all focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/10" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full rounded-2xl bg-cyan-600 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-cyan-600/30 transition-all hover:bg-cyan-700 disabled:opacity-60">
            {isLoading ? 'Entrando...' : 'Entrar no portal'}
          </button>
        </form>
      </div>
    </div>
  );
};
