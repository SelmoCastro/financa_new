import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { VerifyEmail } from './components/VerifyEmail';
import LandingView from './views/LandingView';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    // Agora que o Token é gerido via Cookie HttpOnly,
    // Baseamos nosso controle de UI primariamente da existência local do ID/Nome do usuário.
    // O fallback de segurança absoluto de navegação agora opera pelos Interceptors do Axios e 401s do Backend.
    const userId = localStorage.getItem('userId');

    if (!userId && !localStorage.getItem('token')) { // Fallback temporário p/ Token p/ retrocompatibilidade
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
            </Routes>
        </BrowserRouter>
    );
};

export default Main;