
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import App from './App';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { VerifyEmail } from './components/VerifyEmail';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem('token');
    const [showVerificationModal, setShowVerificationModal] = useState(false);

    useEffect(() => {
        const isVerifiedStr = localStorage.getItem('isEmailVerified');
        if (isVerifiedStr === 'false') {
            setShowVerificationModal(true);
        }
    }, [token]);

    if (!token) {
        return <Navigate to="/login" />;
    }

    return (
        <>
            {showVerificationModal && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full mx-auto flex items-center justify-center mb-4">
                            <i data-lucide="mail-warning" className="w-8 h-8"></i>
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Verifique seu E-mail</h3>
                        <p className="text-sm text-slate-600 mb-6">
                            Para a segurança da sua conta, por favor clique no link de confirmação que enviamos para o seu e-mail.
                        </p>
                        <button
                            onClick={() => {
                                localStorage.removeItem('token');
                                localStorage.removeItem('userName');
                                localStorage.removeItem('isAdmin');
                                localStorage.removeItem('isEmailVerified');
                                window.location.href = '/login';
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-6 rounded-xl w-full transition-all"
                        >
                            Sair e tentar novamente depois
                        </button>
                    </div>
                </div>
            )}
            {children}
        </>
    );
};

const Main = () => {
    useEffect(() => {
        // @ts-ignore
        if (window.lucide) {
            // @ts-ignore
            window.lucide.createIcons();
        }
    });

    return (
        <BrowserRouter>
            <Routes>
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
                <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
        </BrowserRouter>
    );
};

export default Main;
