import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { VerifyEmail } from './components/VerifyEmail';
import LandingView from './views/LandingView';
import PremiumReturn from './components/PremiumReturn';
import api from './services/api';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    // Autenticação via HttpOnly cookie — tenta chamar /auth/me para verificar se o cookie é válido.
    // Enquanto verifica, renderiza loading. Se 401, redireciona para login.
    const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

    useEffect(() => {
        let cancelled = false;
        api.get('/auth/me')
            .then((res) => {
                if (cancelled) return;
                // Qualquer resposta de sucesso = cookie válido
                if (res.data?.user) {
                    setAuthState('authenticated');
                } else {
                    setAuthState('unauthenticated');
                }
            })
            .catch(() => {
                if (!cancelled) setAuthState('unauthenticated');
            });
        return () => { cancelled = true; };
    }, []);

    if (authState === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-8 h-8 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (authState === 'unauthenticated') {
        return <Navigate to="/login" />;
    }

    return (
        <>
            {children}
        </>
    );
};

const Main = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingView />} />
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute>
                            <App />
                        </PrivateRoute>
                    }
                />
                <Route path="/premium/success" element={<PremiumReturn />} />
                <Route path="/premium/failure" element={<PremiumReturn />} />
                <Route path="/premium/pending" element={<PremiumReturn />} />
            </Routes>
        </BrowserRouter>
    );
};

export default Main;