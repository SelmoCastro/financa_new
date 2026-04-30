import axios from 'axios';

const getBaseUrl = () => {
    // @ts-ignore
    const url = import.meta.env.VITE_API_URL || '';
    // Em produção, usa /api/v1 relativo — Nginx faz proxy para o backend
    // Em desenvolvimento, usa o proxy do vite.config.ts -> localhost:3000
    if (!url) return '/api/v1';
    return url.replace(/\/$/, '') + '/v1';
};

/**
 * Lê o CSRF token do cookie setado pelo backend (double-submit pattern).
 * O cookie não é HttpOnly para que o JS possa ler.
 */
function getCsrfTokenFromCookie(): string | null {
    const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : null;
}

const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true, // Envia HttpOnly cookies automaticamente
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    }
});

api.interceptors.request.use((config) => {
    // Auth: Jwt é enviado via HttpOnly cookie automaticamente (withCredentials).
    // O backend extrai do cookie primeiro, depois do header Bearer (para mobile).
    // Web não precisa mais de Authorization header — o cookie basta.

    // CSRF: Para métodos de escrita, enviar o token do cookie como header
    const method = (config.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
            config.headers['x-csrf-token'] = csrfToken;
        }
    }

    return config;
});

// Evita refresh loop infinito caso o próprio refresh falhe
let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

const onTokenRefreshed = () => {
    refreshSubscribers.forEach(cb => cb());
    refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: () => void) => {
    refreshSubscribers.push(cb);
};

// Response interceptor: desempacota o envelope padronizado do backend e captura 401s
api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.data !== undefined) {
            response.data = response.data.data;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Se for 403 por email não verificado, redireciona pra verificação
        if (error.response?.status === 403 && error.response?.data?.message?.includes('Email verification required')) {
            // Redireciona sem gravar em localStorage — o endpoint /auth/me é source of truth
            if (!window.location.pathname.includes('verify-email')) {
                window.location.href = '/verify-email';
            }
            return Promise.reject(error);
        }

        // Se for 401 (sem autorização) e não for rota de auth (evita loops e atrasos no logout)
        const isAuthRoute = ['/auth/refresh', '/auth/logout', '/auth/login'].some(r => originalRequest.url?.includes(r));
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {

            if (isRefreshing) {
                // Se já está fazendo refresh, espera e retry
                return new Promise((resolve) => {
                    addRefreshSubscriber(() => {
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Backend detecta HttpOnly RefreshCookie e retorna novos cookies automaticamente
                await api.post('/auth/refresh', {});

                // Notifica todos os requests que estavam esperando
                onTokenRefreshed();

                // Retry o request original — novos cookies já estão setados
                return api(originalRequest);

            } catch (refreshError) {
                refreshSubscribers = [];
                // Se falhar de vez, redireciona pra login (sem localStorage para limpar)
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;