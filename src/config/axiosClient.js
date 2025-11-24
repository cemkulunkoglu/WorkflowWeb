import axios from 'axios';
import { TOKEN_KEY } from './apiConfig';

const axiosClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🟢 REQUEST INTERCEPTOR (İstek Araya Giren)
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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