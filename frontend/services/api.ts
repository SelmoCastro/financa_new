import axios from 'axios';

const getBaseUrl = () => {
    // @ts-ignore
    const url = import.meta.env.VITE_API_URL || '';
    // In production, use relative /api/v1 — Nginx proxies to backend
    // In development, use /api/v1 proxy from vite.config.ts -> localhost:3000
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
    withCredentials: true, // Garante envio dos HttpOnly Cookies
    headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
    }
});

api.interceptors.request.use((config) => {
    // Auth: Se o fallback via localStorage existir, manda.
    // Mas o backend vai preferir sempre extrair do Cookie HttpOnly (mais seguro).
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

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
let refreshSubscribers: Array<(token: string) => void> = [];

const onTokenRefreshed = (newToken: string) => {
    refreshSubscribers.forEach(cb => cb(newToken));
    refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: (token: string) => void) => {
    refreshSubscribers.push(cb);
};

// Response interceptor to unwrap the standardized backend envelope and trap 401s
api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.data !== undefined) {
            response.data = response.data.data;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Se for 403 por email não verificado, marca e redireciona pra verificação
        if (error.response?.status === 403 && error.response?.data?.message?.includes('Email verification required')) {
            localStorage.setItem('isEmailVerified', 'false');
            // Se nao estamos na tela de verify-email, redireciona
            if (!window.location.pathname.includes('verify-email')) {
                window.location.href = '/verify-email';
            }
            return Promise.reject(error);
        }

        // Se for 401 (sem autorização) e não for rota de auth (evita loops e atrasos no logout)
        const isAuthRoute = ['/auth/refresh', '/auth/logout', '/auth/login'].some(r => originalRequest.url?.includes(r));
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {

            if (isRefreshing) {
                // Se já está fazendo refresh, espera o novo token e retry
                return new Promise((resolve) => {
                    addRefreshSubscriber((newToken: string) => {
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Backend detecta HttpOnly RefreshCookie e retorna novos
                const userId = localStorage.getItem('userId');
                const refreshResponse = await api.post('/auth/refresh', { userId });

                const newToken = refreshResponse.data?.access_token;
                if (newToken) {
                    localStorage.setItem('token', newToken);
                }

                // Notifica todos os requests que estavam esperando
                onTokenRefreshed(newToken || '');

                // Atualiza o header do request original e retry
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                refreshSubscribers = [];
                // Se falhar de vez, desloga e manda pra login
                localStorage.removeItem('token');
                localStorage.removeItem('userId');
                localStorage.removeItem('userName');
                localStorage.removeItem('userEmail');
                localStorage.removeItem('isAdmin');
                localStorage.removeItem('isEmailVerified');
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