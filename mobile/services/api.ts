import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

const API_URL = 'https://api.finanzaai.tech/v1';

const api = axios.create({
    baseURL: API_URL,
    timeout: 30000,
    headers: {
        'x-platform': 'mobile',
    },
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
        const isAuthRoute = originalRequest?.url?.includes('/auth/login') ||
                           originalRequest?.url?.includes('/auth/register') ||
                           originalRequest?.url?.includes('/auth/refresh');
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

                if (!refreshToken) {
                    throw new Error("No refresh token available");
                }

                // Use raw axios to avoid interceptor loop
                // Backend extracts userId from decoded JWT (not from body)
                const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
                    refreshToken
                }, {
                    headers: { 'x-platform': 'mobile' },
                    timeout: 10000,
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

                // Notify AuthContext that token was refreshed so it can update state
                DeviceEventEmitter.emit('auth:token-refreshed', newAccess);
                processQueue(null, newAccess);

                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return api(originalRequest);

            } catch (refreshError: any) {
                const refreshStatus = refreshError?.response?.status;
                if (refreshStatus === 401 || refreshStatus === 403) {
                    // Refresh token is truly expired — must re-login
                    console.log('[API] Refresh token expired. Triggering logout...');
                    await SecureStore.deleteItemAsync('token');
                    await SecureStore.deleteItemAsync('refreshToken');
                    await SecureStore.deleteItemAsync('userId');
                    DeviceEventEmitter.emit('auth:unauthorized');
                }
                // Network errors during refresh — don't logout, just fail the request
                // User stays on screen with whatever data they have

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