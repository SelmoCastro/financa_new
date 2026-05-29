import axios, { AxiosResponse } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { buildScopedCacheKey, getCachedJson, setCachedJson } from './cache';

const API_URL = 'https://api.finanzaai.tech/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'x-platform': 'mobile',
  },
});

type CacheAwareConfig = any;

const isOnline = async () => {
  const netState = await NetInfo.fetch();
  return Boolean(netState.isConnected) && netState.isInternetReachable !== false;
};

const createCachedResponse = <T,>(config: CacheAwareConfig, data: T): AxiosResponse<T> => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
  request: { offlineCache: true },
});

api.interceptors.request.use(async (config) => {
  const requestConfig = config as CacheAwareConfig;
  const token = await SecureStore.getItemAsync('token');
  const method = (requestConfig.method || 'get').toLowerCase();

  requestConfig.headers = requestConfig.headers || {};
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }

  if (method === 'get') {
    requestConfig.__cacheKey = await buildScopedCacheKey(method, requestConfig.url, requestConfig.params as Record<string, unknown> | undefined);

    const online = await isOnline();
    if (!online) {
      const cached = await getCachedJson(requestConfig.__cacheKey);
      if (cached !== null) {
        requestConfig.__offlineCacheHit = true;
        requestConfig.adapter = async () => createCachedResponse(requestConfig, cached);
        return requestConfig;
      }

      const offlineError = new Error('Sem internet e sem cache local') as Error & { code?: string; config?: CacheAwareConfig; isOffline?: boolean };
      offlineError.code = 'ERR_OFFLINE';
      offlineError.config = requestConfig;
      offlineError.isOffline = true;
      throw offlineError;
    }
  }

  return requestConfig;
});

api.interceptors.response.use(
  async (response) => {
    const responseConfig = response.config as CacheAwareConfig;
    const method = (responseConfig.method || 'get').toLowerCase();

    if (method === 'get' && responseConfig.__cacheKey) {
      await setCachedJson(responseConfig.__cacheKey, response.data);
    }

    if (response.data && response.data.data !== undefined) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = (error.config || {}) as CacheAwareConfig;
    const isAuthRoute = originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/refresh');
    const status = error.response?.status;
    const method = (originalRequest.method || 'get').toLowerCase();

    // Only handle 401 for non-auth routes (auth route 401 = wrong credentials)
    if (!isAuthRoute && (status === 401 || status === 403) && !originalRequest._retry) {
      if (originalRequest.__cacheKey && method === 'get') {
        // Try refresh first; if refresh fails because of network, we'll fall back to cache below.
      }

      if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          }).then((newToken) => {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          }).catch(err => {
            return Promise.reject(err);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = await SecureStore.getItemAsync('refreshToken');

          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          // Use raw axios to avoid interceptor loop
          // Backend extracts userId from decoded JWT (not from body)
          const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          }, {
            headers: { 'x-platform': 'mobile' },
            timeout: 10000,
          });

          const newAccess = refreshResponse.data?.access_token || refreshResponse.data?.data?.access_token;
          const newRefresh = refreshResponse.data?.refreshToken || refreshResponse.data?.data?.refreshToken;

          if (!newAccess) {
            throw new Error('No access token in refresh response');
          }

          await SecureStore.setItemAsync('token', newAccess);
          if (newRefresh) {
            await SecureStore.setItemAsync('refreshToken', newRefresh);
          }

          // Notify AuthContext that token was refreshed so it can update state
          DeviceEventEmitter.emit('auth:token-refreshed', newAccess);
          processQueue(null, newAccess);

          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);

        } catch (refreshError: any) {
          const refreshStatus = refreshError?.response?.status;
          if (refreshStatus === 401 || refreshStatus === 403) {
            // Refresh token is truly expired — must re-login
            if (__DEV__) console.log('[API] Refresh token expired. Triggering logout...');
            await SecureStore.deleteItemAsync('token');
            await SecureStore.deleteItemAsync('refreshToken');
            await SecureStore.deleteItemAsync('userId');
            DeviceEventEmitter.emit('auth:unauthorized');
          }

          processQueue(refreshError, null);
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }
    }

    // Offline/5xx fallback for GET requests when cache exists
    if (method === 'get' && originalRequest.__cacheKey && (status == null || status >= 500)) {
      const cached = await getCachedJson(originalRequest.__cacheKey);
      if (cached !== null) {
        return createCachedResponse(originalRequest, cached);
      }
    }

    return Promise.reject(error);
  }
);

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

export default api;
