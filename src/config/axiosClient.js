import axios from 'axios';
import { TOKEN_KEY } from './apiConfig';

const axiosClient = axios.create({
  baseURL: 'https://localhost:7071',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🟢 REQUEST INTERCEPTOR (İstek Araya Giren)
axiosClient.interceptors.request.use(
  (config) => {
    const primaryToken = localStorage.getItem(TOKEN_KEY);
    const fallbackToken =
      primaryToken ||
      localStorage.getItem('token') ||
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
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn("Yetkisiz erişim! Oturum düşmüş olabilir.");
      // İstersen burada login'e yönlendirme yapabilirsin
    }
    return Promise.reject(error);
  }
);

export default axiosClient;