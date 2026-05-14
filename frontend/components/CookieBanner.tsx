import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'finanza_cookie_consent';

/** Atualiza o Google Consent Mode conforme escolha do usuário */
function updateConsent(accepted: boolean) {
    if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
        if (accepted) {
            (window as any).gtag('consent', 'update', {
                'analytics_storage': 'granted',
                'ad_storage': 'denied', // nunca ads
            });
        } else {
            (window as any).gtag('consent', 'update', {
                'analytics_storage': 'denied',
                'ad_storage': 'denied',
            });
        }
    }
}

/** Lê o consentimento salvo */
function getSavedConsent(): { accepted: boolean; ts: number } | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export const CookieBanner: React.FC = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const saved = getSavedConsent();
        if (!saved) {
            setVisible(true);
        } else {
            // Re-aplica consentimento salvo (ex: após reload)
            updateConsent(saved.accepted);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, ts: Date.now() }));
        updateConsent(true);
        setVisible(false);
    };

    const handleDecline = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: false, ts: Date.now() }));
        updateConsent(false);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-500">
            <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            🍪 Utilizamos cookies essenciais para autenticação e segurança, e cookies de análise para melhorar sua experiência.
                            Você pode aceitar ou recusar os cookies de análise a qualquer momento.{' '}
                            <a
                                href="https://finanzaai.tech/legal/privacy.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800"
                            >
                                Política de Privacidade
                            </a>
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button
                            onClick={handleDecline}
                            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            Recusar
                        </button>
                        <button
                            onClick={handleAccept}
                            className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
                        >
                            Aceitar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** Link para reabrir as preferências de cookies — colocar no rodapé */
export const CookiePrefsLink: React.FC = () => {
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    };

    return (
        <a
            href="#cookie-preferences"
            onClick={handleClick}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-xs underline transition-colors"
        >
            Preferências de Cookies
        </a>
    );
};