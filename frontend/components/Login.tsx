
import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export const Login: React.FC = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState(''); // Only for register
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            if (isRegister) {
                await api.post('/auth/register', { email, password, name });
                alert('Cadastro realizado com sucesso! Faça login.');
                setIsRegister(false);
            } else {
                const response = await api.post('/auth/login', { email, password });
                localStorage.setItem('token', response.data.access_token);
                localStorage.setItem('userName', response.data.user.name);
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Erro ao realizar operação');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl w-full max-w-md border border-slate-100">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-indigo-600/30">
                        <i data-lucide="layout-dashboard" className="text-white w-8 h-8"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-800">{isRegister ? 'Criar Conta' : 'Bem-vindo de volta'}</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">{isRegister ? 'Comece a controlar suas finanças hoje' : 'Acesse seu painel financeiro'}</p>
                </div>

                {error && (
                    <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold mb-6 flex items-center gap-2">
                        <i data-lucide="alert-circle" className="w-4 h-4"></i>
                        {error}
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
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Senha</label>
                        <input
                            type="password"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-slate-700 transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl uppercase text-xs tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-95 mt-4"
                    >
                        {isRegister ? 'Cadastrar' : 'Entrar'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-indigo-600 text-sm font-bold hover:underline"
                    >
                        {isRegister ? 'Já tem uma conta? Entre' : 'Não tem conta? Cadastre-se'}
                    </button>
                </div>
            </div>
        </div>
    );
};
