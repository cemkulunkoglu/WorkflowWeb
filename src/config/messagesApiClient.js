import axios from "axios";
import { authStorage } from "../auth/authStorage";

// MessagesService HTTPS üzerinde çalışır. HTTP ile istek atılırsa backend "socket hang up" döndürebilir.
const messagesApiClient = axios.create({
  baseURL: "https://localhost:7016",
  headers: {
    "Content-Type": "application/json",
  },
});

messagesApiClient.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

messagesApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      authStorage.clearAll();
      window.location.assign("/login");
    }

    if (error.response && error.response.status === 403) {
      const code = error?.response?.data?.code;
      if (code === "ACCOUNT_NOT_VERIFIED") {
        window.location.assign("/change-password");
      }
    }

    return Promise.reject(error);
  }
);

export default messagesApiClient;


