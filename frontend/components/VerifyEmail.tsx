/**
 * Componente reutilizável do frontend; encapsula uma parte relevante da interface dentro do domínio de componentes reutilizáveis da interface.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('loading');
    const [message, setMessage] = useState('Verificando seu e-mail...');
    const [resendCooldown, setResendCooldown] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const verifyToken = async () => {
            // Sem token = chegou pelo redirect do 403 ou acessou direto
            if (!token) {
                setStatus('pending');
                setMessage('Verifique sua caixa de entrada ou reenvie o e-mail de confirmação.');
                return;
            }

            try {
                const response = await api.post('/auth/verify-email', { token });
                setStatus('success');
                setMessage(response.data.message || 'E-mail verificado com sucesso!');
                // Não gravamos isEmailVerified em localStorage — /auth/me é source of truth
                setTimeout(() => {
                    navigate('/dashboard');
                }, 3000);
            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setMessage(err.response?.data?.message || 'Erro ao verificar o e-mail. O link pode ter expirado.');
            }
        };

        verifyToken();
    }, [token, navigate]);

    // Cooldown timer pro botao de resend
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    const handleResend = async () => {
        try {
            await api.post('/auth/resend-verification');
            setResendCooldown(60); // 60s cooldown
            setMessage('E-mail de verificação reenviado! Verifique sua caixa de entrada.');
        } catch (err: any) {
            setMessage(err.response?.data?.message || 'Erro ao reenviar. Tente novamente.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-500">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className={`w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 ${
                    status === 'success' 
                        ? 'bg-emerald-600 shadow-emerald-600/40 text-white' 
                        : status === 'error' 
                            ? 'bg-rose-600 shadow-rose-600/40 text-white' 
                            : status === 'pending'
                                ? 'bg-amber-500 shadow-amber-500/40 text-white'
                                : 'bg-cyan-600 shadow-cyan-600/40 text-white'
                }`}>
                    {status === 'loading' && <span className="text-5xl animate-spin">⏳</span>}
                    {status === 'success' && <span className="text-5xl">✅</span>}
                    {status === 'error' && <span className="text-5xl">❌</span>}
                    {status === 'pending' && <span className="text-5xl">📧</span>}
                </div>

                <div className="space-y-2 mb-8">
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                        status === 'success' ? 'text-emerald-600 dark:text-emerald-400' 
                        : status === 'error' ? 'text-rose-600 dark:text-rose-400' 
                        : status === 'pending' ? 'text-amber-600 dark:text-amber-400'
                        : 'text-cyan-600 dark:text-cyan-400'
                    }`}>
                        Autenticação
                    </p>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        {status === 'loading' ? 'Verificando...' 
                        : status === 'success' ? 'Sucesso!' 
                        : status === 'pending' ? 'Verifique seu e-mail'
                        : 'Ops! Algo deu errado'}
                    </h2>
                    <p className={`text-sm font-medium leading-relaxed px-4 ${
                        status === 'error' ? 'text-rose-600 dark:text-rose-400' 
                        : status === 'pending' ? 'text-slate-500 dark:text-slate-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                        {message}
                    </p>
                </div>

                <div className="space-y-3">
                    {/* Botao de reenviar (pending/error) */}
                    {(status === 'pending' || status === 'error') && (
                        <button
                            onClick={handleResend}
                            disabled={resendCooldown > 0}
                            className={`w-full py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-xl ${
                                resendCooldown > 0 
                                    ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed shadow-none' 
                                    : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30 text-white'
                            }`}
                        >
                            {resendCooldown > 0 
                                ? `Aguarde ${resendCooldown}s para reenviar` 
                                : 'Reenviar e-mail de verificação'}
                        </button>
                    )}

                    {/* Botao de acessar conta (success) ou voltar pro login */}
                    {status !== 'loading' && (
                        <button
                            onClick={() => navigate(status === 'success' ? '/dashboard' : '/login')}
                            className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-2xl ${
                                status === 'success' 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 text-white' 
                                    : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/30 text-white'
                            }`}
                        >
                            {status === 'success' ? 'Acessar Minha Conta' : 'Voltar para Login'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};