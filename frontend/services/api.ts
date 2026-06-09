/**
 * Cliente HTTP principal do frontend web; cuida de baseURL, CSRF, refresh de sessão e desempacotamento do envelope da API.
 */
import axios from 'axios';

const getBaseUrl = () => {
    // @ts-ignore
    const url = import.meta.env.VITE_API_URL || '';
    // Em produção, usa /api/v1 relativo para manter frontend e backend no mesmo domínio.
    // Em desenvolvimento, o Vite reescreve /api para o backend local.
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
    // No web, a sessão fica em cookie HttpOnly. Este interceptor só complementa com CSRF nos métodos mutáveis.
    const method = (config.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
            config.headers['x-csrf-token'] = csrfToken;
        }
    }

    return config;
});

// Coordena refresh concorrente para que vários 401 simultâneos gerem um único refresh real.
let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

const onTokenRefreshed = () => {
    refreshSubscribers.forEach(cb => cb());
    refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: () => void) => {
    refreshSubscribers.push(cb);
};

// Desempacota o envelope padrão do backend e tenta recuperar sessões expiradas de forma transparente.
api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.data !== undefined) {
            response.data = response.data.data;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Bloqueios de verificação de e-mail merecem redirecionamento imediato porque não serão resolvidos por refresh.
        if (error.response?.status === 403 && error.response?.data?.message?.includes('Email verification required')) {
            // O endpoint /auth/me continua sendo a fonte da verdade; nada de espelhar sessão no localStorage.
            if (!window.location.pathname.includes('verify-email')) {
                window.location.href = '/verify-email';
            }
            return Promise.reject(error);
        }

        // 401 em rotas normais tenta refresh; 401 em rotas de auth cai fora para evitar loop infinito.
        const isAuthRoute = ['/auth/refresh', '/auth/logout', '/auth/login'].some(r => originalRequest.url?.includes(r));
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {

            if (isRefreshing) {
                // Requests concorrentes aguardam a primeira renovação terminar antes de repetir a chamada original.
                return new Promise((resolve) => {
                    addRefreshSubscriber(() => {
                        resolve(api(originalRequest));
                    });
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // O backend lê o refresh cookie e devolve novos cookies sem expor token ao JavaScript.
                await api.post('/auth/refresh', {});

                // Libera a fila de requests que ficaram pendentes durante a renovação.
                onTokenRefreshed();

                // O retry reaproveita a config original; os cookies novos já foram persistidos pelo navegador.
                return api(originalRequest);

            } catch (refreshError) {
                refreshSubscribers = [];
                // Se o refresh falhar, a sessão realmente morreu e o usuário volta para login.
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