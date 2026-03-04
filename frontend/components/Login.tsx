
import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Only for register
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
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
                const response = await api.post('/auth/register', { email, password, name });

                // Salvar credenciais no Local Storage para auto-login
                if (response.data.access_token) {
                    localStorage.setItem('token', response.data.access_token);
                    localStorage.setItem('userName', response.data.user.name);
                    localStorage.setItem('isAdmin', response.data.user.isAdmin ? 'true' : 'false');
                    localStorage.setItem('isEmailVerified', response.data.user.isEmailVerified ? 'true' : 'false');
                    navigate('/dashboard');
                } else {
                    setSuccessMsg(response.data.message || 'Cadastro realizado com sucesso! Verifique seu e-mail.');
                    setIsRegister(false);
                }
            } else {
                const response = await api.post('/auth/login', { email, password });
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('userName', response.data.user.name);
                localStorage.setItem('isAdmin', response.data.user.isAdmin ? 'true' : 'false');
                localStorage.setItem('isEmailVerified', response.data.user.isEmailVerified ? 'true' : 'false');
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || 'Erro ao realizar operação. Verifique sua conexão.';
            setError(msg);
            alert(msg); // Fallback to ensure visibility
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        // @ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }, [error, isRegister, successMsg, isForgotPassword]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/30">
                        <i data-lucide="layout-dashboard" className="text-white w-8 h-8"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">
                        {isForgotPassword ? 'Recuperar Senha' : isRegister ? 'Criar Conta' : 'Bem-vindo de volta'}
                    </h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">
                        {isForgotPassword
                            ? 'Enviaremos um link para você redefinir sua senha'
                            : isRegister
                                ? 'Comece a controlar suas finanças hoje'
                                : 'Acesse seu painel financeiro'}
                    </p>
                </div>

                {error && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
                        <i data-lucide="alert-circle" className="w-4 h-4"></i>
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
                        <i data-lucide="check-circle" className="w-4 h-4"></i>
                        {successMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {isRegister && (
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    {!isForgotPassword && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                                {!isRegister && (
                                    <button
                                        type="button"
                                        onClick={() => { setIsForgotPassword(true); setError(''); setSuccessMsg(''); }}
                                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider"
                                    >
                                        Esqueci a senha
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl uppercase text-xs tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 mt-4"
                    >
                        {isLoading ? 'Carregando...' : (isForgotPassword ? 'Enviar Link' : isRegister ? 'Cadastrar' : 'Entrar')}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-2">
                    {isForgotPassword ? (
                        <button
                            onClick={() => setIsForgotPassword(false)}
                            className="text-slate-500 text-sm font-bold hover:text-slate-700"
                        >
                            Voltar para o login
                        </button>
                    ) : (
                        <button
                            onClick={() => { setIsRegister(!isRegister); setError(''); setSuccessMsg(''); }}
                            className="text-indigo-600 text-sm font-bold hover:underline block w-full"
                        >
                            {isRegister ? 'Já tem uma conta? Entre' : 'Não tem conta? Cadastre-se'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
