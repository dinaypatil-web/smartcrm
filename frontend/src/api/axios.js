import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
    // If environment variable is set, use it
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // In production (Vercel), use your backend URL
    if (import.meta.env.PROD) {
        // TODO: Replace with your actual backend URL after deployment
        return 'https://your-backend-url.up.railway.app/api';
    }

    // In development, use localhost
    return 'http://localhost:5000/api';
};

const api = axios.create({
    baseURL: getApiUrl(),
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refreshToken');
                const { data } = await axios.post(`${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`, { refreshToken });
                localStorage.setItem('token', data.token);
                localStorage.setItem('refreshToken', data.refreshToken);
                originalRequest.headers.Authorization = `Bearer ${data.token}`;
                return api(originalRequest);
            } catch (refreshError) {
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
