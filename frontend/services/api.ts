
import axios from 'axios';

const getBaseUrl = () => {
    // @ts-ignore
    const url = import.meta.env.VITE_API_URL || '';
    // In production (Vercel), use relative /api/v1 — Vercel rewrites proxy to Render
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
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
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

        // Se for 401 (sem autorização) e não for rota de auth (evita loops e atrasos no logout)
        const isAuthRoute = ['/auth/refresh', '/auth/logout', '/auth/login'].some(r => originalRequest.url?.includes(r));
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {

            if (isRefreshing) {
                // Aguarda a fila do request atual em refresh para continuar dps
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Backend detecta HttpOnly RefreshCookie e retorna novos
                // Não precisa mandar o payload pro refreshCookie automático funcionar
                const userId = localStorage.getItem('userId');
                const refreshResponse = await api.post('/auth/refresh', { userId });

                // Atualiza o token no localStorage para fallback Bearer
                // (cookies HttpOnly já são atualizados automaticamente pelo browser)
                if (refreshResponse.data?.access_token) {
                    localStorage.setItem('token', refreshResponse.data.access_token);
                }

                // Se der certo, refaz os requests que travaram no 401
                processQueue(null);
                return api(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                // Se falhar de vez, desloga e manda pra home
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
