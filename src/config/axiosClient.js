import axios from 'axios';
import { TOKEN_KEY } from './apiConfig';
import { authStorage } from '../auth/authStorage';

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_WORKFLOW_API_BASE_URL || 'https://localhost:7071',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🟢 REQUEST INTERCEPTOR (İstek Araya Giren)
axiosClient.interceptors.request.use(
  (config) => {
    const primaryToken =
      authStorage.getToken() ||
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY);
    const fallbackToken =
      primaryToken ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('jwt');

    if (fallbackToken) {
      config.headers.Authorization = `Bearer ${fallbackToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// 🔴 RESPONSE INTERCEPTOR (Cevap Araya Giren)
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      authStorage.clearAll();
      window.location.assign('/login');
    }

    if (error.response && error.response.status === 403) {
      const code = error?.response?.data?.code;
      if (code === 'ACCOUNT_NOT_VERIFIED') {
        window.location.assign('/change-password');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;