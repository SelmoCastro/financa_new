import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export const VerifyEmail: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verificando seu e-mail...');
    const navigate = useNavigate();

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setStatus('error');
                setMessage('Link de verificação inválido ou inexistente.');
                return;
            }

            try {
                const response = await api.post('/auth/verify-email', { token });
                setStatus('success');
                setMessage(response.data.message || 'E-mail verificado com sucesso!');
                setTimeout(() => {
                    navigate('/login');
                }, 4000);
            } catch (err: any) {
                console.error(err);
                setStatus('error');
                setMessage(err.response?.data?.message || 'Erro ao verificar o e-mail. O link pode ter expirado.');
            }
        };

        verifyToken();
    }, [token, navigate]);

    useEffect(() => {
        // @ts-ignore
        if (window.lucide) window.lucide.createIcons();
    }, [status]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-500">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-800 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className={`w-24 h-24 rounded-[2rem] mx-auto flex items-center justify-center mb-8 shadow-2xl transition-all duration-500 ${
                    status === 'success' 
                        ? 'bg-emerald-600 shadow-emerald-600/40 text-white' 
                        : status === 'error' 
                            ? 'bg-rose-600 shadow-rose-600/40 text-white' 
                            : 'bg-indigo-600 shadow-indigo-600/40 text-white'
                }`}>
                    {status === 'loading' && <i data-lucide="loader-2" className="w-12 h-12 animate-spin"></i>}
                    {status === 'success' && <i data-lucide="check-circle" className="w-12 h-12"></i>}
                    {status === 'error' && <i data-lucide="x-circle" className="w-12 h-12"></i>}
                </div>

                <div className="space-y-2 mb-8">
                    <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${
                        status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : status === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'
                    }`}>
                        Autenticação
                    </p>
                    <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        {status === 'loading' ? 'Verificando...' : status === 'success' ? 'Sucesso!' : 'Ops! Algo deu errado'}
                    </h2>
                    <p className={`text-sm font-medium leading-relaxed px-4 ${status === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                        {message}
                    </p>
                </div>

                {status !== 'loading' && (
                    <button
                        onClick={() => navigate('/login')}
                        className={`w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all active:scale-95 shadow-2xl ${
                            status === 'success' 
                                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 text-white' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 text-white'
                        }`}
                    >
                        Acessar Minha Conta
                    </button>
                )}
            </div>
        </div>
    );
};
