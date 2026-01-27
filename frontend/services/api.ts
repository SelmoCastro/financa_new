
import axios from 'axios';

const api = axios.create({
    baseURL: (import.meta.env.VITE_API_URL || 'https://financa-new.vercel.app') + '/v1',
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to unwrap the standardized backend envelope
api.interceptors.response.use(
    (response) => {
        // Backend returns { statusCode, data, timestamp }
        // We want to return just 'data' to the application to avoid refactoring all components
        if (response.data && response.data.data !== undefined) {
            response.data = response.data.data;
        }
        return response;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
