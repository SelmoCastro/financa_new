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
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md border border-slate-100 text-center">
                <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-${status === 'success' ? 'emerald' : status === 'error' ? 'rose' : 'indigo'}-600/30 bg-${status === 'success' ? 'emerald' : status === 'error' ? 'rose' : 'indigo'}-600`}>
                    {status === 'loading' && <i data-lucide="loader-2" className="text-white w-10 h-10 animate-spin"></i>}
                    {status === 'success' && <i data-lucide="check-circle" className="text-white w-10 h-10"></i>}
                    {status === 'error' && <i data-lucide="x-circle" className="text-white w-10 h-10"></i>}
                </div>

                <h2 className="text-2xl font-black text-slate-800 mb-2">
                    {status === 'loading' ? 'Verificando E-mail' : status === 'success' ? 'E-mail Confirmado!' : 'Falha na Verificação'}
                </h2>

                <p className={`text-sm font-medium ${status === 'error' ? 'text-rose-600' : 'text-slate-500'}`}>
                    {message}
                </p>

                {status !== 'loading' && (
                    <button
                        onClick={() => navigate('/login')}
                        className={`mt-8 w-full bg-${status === 'success' ? 'emerald' : 'indigo'}-600 hover:bg-${status === 'success' ? 'emerald' : 'indigo'}-700 text-white font-bold py-4 rounded-xl uppercase text-xs tracking-widest transition-all shadow-xl shadow-${status === 'success' ? 'emerald' : 'indigo'}-600/20 active:scale-95`}
                    >
                        Ir para o Login
                    </button>
                )}
            </div>
        </div>
    );
};
