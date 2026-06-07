/**
 * Cliente HTTP do portal de revendedores; isola autenticação, refresh e tratamento das rotas do canal revendedor.
 */
import axios from 'axios';

const getBaseUrl = () => {
  // @ts-ignore
  const url = import.meta.env.VITE_API_URL || '';
  if (!url) return '/api/v1';
  return url.replace(/\/$/, '') + '/v1';
};

function getCsrfTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Cliente isolado do portal revendedor para não misturar estado de sessão com o dashboard comum.
const resellerApi = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  },
});

resellerApi.interceptors.request.use((config) => {
  // Assim como no web app principal, o portal usa cookie HttpOnly + header CSRF para escritas.
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrfToken = getCsrfTokenFromCookie();
    if (csrfToken) {
      config.headers['x-csrf-token'] = csrfToken;
    }
  }

  return config;
});

// Evita tempestade de refresh quando várias chamadas do portal recebem 401 ao mesmo tempo.
let isRefreshing = false;
let refreshSubscribers: Array<() => void> = [];

const onTokenRefreshed = () => {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
};

const addRefreshSubscriber = (cb: () => void) => {
  refreshSubscribers.push(cb);
};

resellerApi.interceptors.response.use(
  (response) => {
    if (response.data && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    // Rotas de auth não podem tentar refresh em cascata; do contrário o portal entra em loop.
    const isAuthRoute = [
      '/reseller-portal/auth/refresh',
      '/reseller-portal/auth/logout',
      '/reseller-portal/auth/login',
    ].some((route) => originalRequest.url?.includes(route));

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber(() => resolve(resellerApi(originalRequest)));
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // O refresh usa o cookie próprio do revendedor, totalmente separado do cookie do usuário final.
        await resellerApi.post('/reseller-portal/auth/refresh', {});
        onTokenRefreshed();
        return resellerApi(originalRequest);
      } catch (refreshError) {
        refreshSubscribers = [];
        // Se a sessão do revendedor expirar, o portal volta direto para a tela de login dedicada.
        window.location.href = '/revendedor/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default resellerApi;
