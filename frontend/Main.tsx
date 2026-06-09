/**
 * Define o roteamento principal do frontend, separando fluxo público, fluxo autenticado e portal do revendedor.
 */
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { VerifyEmail } from './components/VerifyEmail';
import LandingView from './views/LandingView';
import { CookieBanner } from './components/CookieBanner';
import api from './services/api';
import resellerApi from './services/resellerApi';
import { ResellerLoginView } from './views/reseller/ResellerLoginView';
import { ResellerPortalView } from './views/reseller/ResellerPortalView';

// Tela de espera usada enquanto o frontend decide se existe sessão válida.
const FullscreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
    <div className="w-8 h-8 border-4 border-cyan-200 border-t-cyan-600 rounded-full animate-spin"></div>
  </div>
);

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    let cancelled = false;
    // O frontend usa /auth/me como fonte da verdade; não depende de localStorage para saber se o usuário está logado.
    api
      .get('/auth/me')
      .then((res) => {
        if (cancelled) return;
        if (res.data?.user) {
          setAuthState('authenticated');
        } else {
          setAuthState('unauthenticated');
        }
      })
      .catch(() => {
        if (!cancelled) setAuthState('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === 'checking') return <FullscreenLoader />;
  if (authState === 'unauthenticated') return <Navigate to="/login" />;
  return <>{children}</>;
};

const ResellerPrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    let cancelled = false;
    // O portal do revendedor tem sessão separada da sessão do usuário final.
    resellerApi
      .get('/reseller-portal/auth/me')
      .then((res) => {
        if (cancelled) return;
        if (res.data?.reseller) {
          setAuthState('authenticated');
        } else {
          setAuthState('unauthenticated');
        }
      })
      .catch(() => {
        if (!cancelled) setAuthState('unauthenticated');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (authState === 'checking') return <FullscreenLoader />;
  if (authState === 'unauthenticated') return <Navigate to="/revendedor/login" />;
  return <>{children}</>;
};

const Main = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Fluxo público principal do produto. */}
        <Route path="/" element={<LandingView />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        {/* Dashboard interno do usuário final autenticado. */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <App />
            </PrivateRoute>
          }
        />
        {/* Portal dedicado para revendedores, com auth isolada. */}
        <Route path="/revendedor/login" element={<ResellerLoginView />} />
        <Route
          path="/revendedor/painel"
          element={
            <ResellerPrivateRoute>
              <ResellerPortalView />
            </ResellerPrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {/* Banner LGPD global para qualquer rota aberta no navegador. */}
      <CookieBanner />
    </BrowserRouter>
  );
};

export default Main;
