import axios from 'axios';
import { BASE_URL } from './config';

const api = axios.create({
    baseURL: `${BASE_URL}/api`,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('nexus_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('nexus_token');
            localStorage.removeItem('nexus_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
