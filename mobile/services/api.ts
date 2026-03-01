import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

const API_URL = 'https://financa-new-api.vercel.app/v1'; // Production Vercel URL
// Para teste local, use o seu IP:
// const API_URL = 'http://192.168.18.114:3000/v1';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

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
        const isAuthRoute = error.config?.url?.includes('/auth/');
        if (!isAuthRoute && error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.log('[API] 401/403 detectado. Limpando token e emitindo evento...');
            await SecureStore.deleteItemAsync('token');
            DeviceEventEmitter.emit('auth:unauthorized');
        }
        return Promise.reject(error);
    }
);

export default api;
