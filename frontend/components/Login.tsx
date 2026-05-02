import React, { useState } from 'react';
import { LayoutDashboard, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SmartBanner } from './SmartBanner';

export const Login: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Only for register
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(() => searchParams.get('mode') === 'recovery');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsLoading(true);

        try {
            if (isForgotPassword) {
                await api.post('/auth/forgot-password', { email });
                setSuccessMsg('Se este e-mail estiver cadastrado, você receberá um link de recuperação em breve.');
                setIsForgotPassword(false);
            } else if (isRegister) {
                // Validação de força de senha no front (eco do back)
                if (password.length < 8) {
                    setError('A senha deve ter pelo menos 8 caracteres.');
                    setIsLoading(false);
                    return;
                }
                if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
                    setError('A senha deve conter pelo menos letras e números.');
                    setIsLoading(false);
                    return;
                }
                if (!termsAccepted) {
                    setError('Você deve aceitar os Termos de Uso e a Política de Privacidade para criar uma conta.');
                    setIsLoading(false);
                    return;
                }

                const response = await api.post('/auth/register', { email, password, name, termsAccepted });

                // HttpOnly cookie já foi setado pelo backend.
                // Dados do usuário serão obtidos via /auth/me no App.tsx.
                if (response.data.user) {
                    // Redireciona pra verificação se email não verificado
                    if (!response.data.user.isEmailVerified) {
                        navigate('/verify-email');
                    } else {
                        navigate('/dashboard');
                    }
                } else {
                    setSuccessMsg(response.data.message || 'Cadastro realizado com sucesso!');
                    setIsRegister(false);
                }
            } else {
                await api.post('/auth/login', { email, password });
                // HttpOnly cookie já setado pelo backend.
                // Dados do usuário serão buscados via /auth/me.
                // Verifica se email está verificado via /auth/me após redirect
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || 'Erro ao realizar operação. Verifique sua conexão.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <SmartBanner />
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-500">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-10">
                    <img src="/logo.png" alt="Finanza AI" className="w-20 h-20 rounded-[2rem] mx-auto mb-6 shadow-2xl shadow-cyan-600/40 group hover:scale-110 transition-transform duration-500 cursor-pointer object-contain bg-slate-900" />
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-cyan-600 dark:text-cyan-400 tracking-[0.3em] mb-2">Finanza AI</p>
                        <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                            {isForgotPassword ? 'Recuperar Acesso' : isRegister ? 'Criar Nova Conta' : 'Bem-vindo de volta'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">
                            {isForgotPassword
                                ? 'Enviaremos um link seguro para você'
                                : isRegister
                                    ? 'Comece sua jornada financeira hoje'
                                    : 'Acesse seu painel inteligente'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 p-5 rounded-2xl text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-3 border border-rose-100 dark:border-rose-500/20 animate-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-5 rounded-2xl text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-3 border border-emerald-100 dark:border-emerald-500/20 animate-in slide-in-from-top-2">
                        <CheckCircle className="w-5 h-5 shrink-0" />
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {isRegister && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 block">Seu Nome</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none font-bold text-slate-800 dark:text-white transition-all text-base placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Como quer ser chamado?"
                                required
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1 block">Endereço de Email</label>
                        <input
                            type="email"
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none font-bold text-slate-800 dark:text-white transition-all text-base placeholder:text-slate-400 dark:placeholder:text-slate-600"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            title="Por favor, digite um e-mail com formato válido (ex: seu.nome@dominio.com.br)"
                            required
                        />
                    </div>
                    {!isForgotPassword && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-1">Senha de Acesso</label>
                                {!isRegister && (
                                    <button
                                        type="button"
                                        onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}
                                        className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 uppercase tracking-widest transition-colors"
                                    >
                                        Esqueceu?
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-4 focus:ring-cyan-500/10 focus:border-cyan-500 outline-none font-bold text-slate-800 dark:text-white transition-all text-base placeholder:text-slate-400 dark:placeholder:text-slate-600"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    )}

                    {isRegister && !isForgotPassword && (
                        <label className="flex items-start gap-3 cursor-pointer mt-2">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Eu li e aceito os{' '}
                                <a
                                    href="https://finanzaai.tech/legal/terms.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-600 dark:text-cyan-400 underline hover:text-cyan-700"
                                >
                                    Termos de Uso
                                </a>{' '}
                                e a{' '}
                                <a
                                    href="https://finanzaai.tech/legal/privacy.html"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-600 dark:text-cyan-400 underline hover:text-cyan-700"
                                >
                                    Política de Privacidade
                                </a>
                            </span>
                        </label>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl uppercase text-[10px] tracking-[0.2em] transition-all shadow-2xl shadow-cyan-600/30 active:scale-95 mt-6"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Aguarde...</span>
                            </div>
                        ) : (isForgotPassword ? 'Enviar Link de Resgate' : isRegister ? 'Criar Minha Conta' : 'Entrar no Painel')}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-slate-100 dark:border-slate-800">
                    {isForgotPassword ? (
                        <button
                            onClick={() => setIsForgotPassword(false)}
                            className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-700 dark:hover:text-white transition-colors"
                        >
                            Voltar para o login
                        </button>
                    ) : (
                        <button
                            onClick={() => { setIsRegister(!isRegister); setError(''); setSuccessMsg(''); setTermsAccepted(false); }}
                            className="text-cyan-600 dark:text-cyan-400 text-xs font-black uppercase tracking-widest hover:text-cyan-700 dark:hover:text-cyan-300 transition-colors"
                        >
                            {isRegister ? 'Já tem uma conta? Entrar' : 'Novo por aqui? Cadastre-se'}
                        </button>
                    )}
                </div>
            </div>
            </div>
        </>
    );
};