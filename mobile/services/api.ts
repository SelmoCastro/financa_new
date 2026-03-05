import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

const API_URL = 'https://financa-new-api.vercel.app/v1'; // Production Vercel URL
// Para teste local, use o seu IP:
// const API_URL = 'http://192.168.18.114:3000/v1';

const api = axios.create({
    baseURL: API_URL,
    timeout: 60000, // 60s timeout para processamentos de IA longos
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
        console.log(`[API Response] ${response.config.url} - Status: ${response.status}`);
        if (response.data && response.data.data !== undefined) {
            console.log('[API Interceptor] Unwrapping data body...');
            response.data = response.data.data;
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        const isAuthRoute = originalRequest?.url?.includes('/auth/');

        if (!isAuthRoute && error.response && (error.response.status === 401 || error.response.status === 403) && !originalRequest._retry) {

            if (isRefreshing) {
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
                const refreshToken = await SecureStore.getItemAsync('refreshToken');
                const userId = await SecureStore.getItemAsync('userId'); // Added during login now

                if (!refreshToken || !userId) {
                    throw new Error("No refresh tokens available to retry auth");
                }

                // Call backend via the standard POST body since missing Cookies
                const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, {
                    userId,
                    refreshToken
                });

                // Update SecureStore with new tokens
                const newAccess = refreshResponse.data.access_token || refreshResponse.data.data.access_token;
                const newRefresh = refreshResponse.data.refreshToken || refreshResponse.data.data.refreshToken;

                await SecureStore.setItemAsync('token', newAccess);
                await SecureStore.setItemAsync('refreshToken', newRefresh);

                // Update current failed request and re-run queue
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                processQueue(null);

                return api(originalRequest);

            } catch (refreshError) {
                console.log('[API] Refresh Local Error detectado. Limpando tokens e emitindo evento...');
                await SecureStore.deleteItemAsync('token');
                await SecureStore.deleteItemAsync('refreshToken');
                await SecureStore.deleteItemAsync('userId');
                DeviceEventEmitter.emit('auth:unauthorized');
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
