import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            setError('Link de recuperação inválido ou inexistente.');
        }
        // @ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }, [token, error, successMsg]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/auth/reset-password', { token, password });
            setSuccessMsg('Sua senha foi redefinida com sucesso! Redirecionando para o Login...');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || 'Erro ao redefinir a senha. O link pode ter expirado.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
                        <i data-lucide="key" className="text-white w-8 h-8"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">Nova Senha</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Crie uma nova senha para sua conta</p>
                </div>

                {error && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
                        <i data-lucide="alert-circle" className="w-4 h-4 flex-shrink-0"></i>
                        {error}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
                        <i data-lucide="check-circle" className="w-4 h-4 flex-shrink-0"></i>
                        {successMsg}
                    </div>
                )}

                {token && !successMsg && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nova Senha</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-bold text-slate-700 transition-all"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-600/20 active:scale-95 mt-4"
                        >
                            {isLoading ? 'Salvando...' : 'Salvar Nova Senha'}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-slate-500 text-sm font-bold hover:text-slate-700"
                    >
                        Voltar para o login
                    </button>
                </div>
            </div>
        </div>
    );
};
