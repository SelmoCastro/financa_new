import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

const API_URL = 'https://api.finanzaai.tech/v1';

const api = axios.create({
    baseURL: API_URL,
    timeout: 60000,
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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

api.interceptors.response.use(
    (response) => {
        if (response.data && response.data.data !== undefined) {
            response.data = response.data.data;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const isAuthRoute = originalRequest?.url?.includes('/auth/');
        const status = error.response?.status;

        // Only handle 401 for non-auth routes (auth route 401 = wrong credentials)
        if (!isAuthRoute && (status === 401 || status === 403) && !originalRequest._retry) {

            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then((newToken) => {
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
                const userId = await SecureStore.getItemAsync('userId');

                if (!refreshToken || !userId) {
                    throw new Error("No refresh tokens available");
                }

                // Use raw axios to avoid interceptor loop
                const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
                    userId,
                    refreshToken
                });

                const newAccess = refreshResponse.data?.access_token || refreshResponse.data?.data?.access_token;
                const newRefresh = refreshResponse.data?.refreshToken || refreshResponse.data?.data?.refreshToken;

                if (!newAccess) {
                    throw new Error("No access token in refresh response");
                }

                await SecureStore.setItemAsync('token', newAccess);
                if (newRefresh) {
                    await SecureStore.setItemAsync('refreshToken', newRefresh);
                }

                processQueue(null, newAccess);

                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return api(originalRequest);

            } catch (refreshError: any) {
                console.log('[API] Refresh falhou. Limpando tokens...');
                
                // Only logout if refresh explicitly failed (not network error)
                const refreshStatus = refreshError?.response?.status;
                if (refreshStatus === 401 || refreshStatus === 403) {
                    // Refresh token is truly expired — must re-login
                    await SecureStore.deleteItemAsync('token');
                    await SecureStore.deleteItemAsync('refreshToken');
                    await SecureStore.deleteItemAsync('userId');
                    DeviceEventEmitter.emit('auth:unauthorized');
                }
                // Network errors — don't logout, just reject. User stays on screen,
                // can pull-to-refresh or retry later
                
                processQueue(refreshError, null);
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;