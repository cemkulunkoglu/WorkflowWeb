import axios from 'axios';
import { authStorage } from '../auth/authStorage';

// WorkflowAPI (Org/Tree)
const workflowApiClient = axios.create({
  baseURL: import.meta.env.VITE_WORKFLOW_API_BASE_URL || 'https://localhost:7071',
  headers: {
    'Content-Type': 'application/json',
  },
});

workflowApiClient.interceptors.request.use(
  (config) => {
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

workflowApiClient.interceptors.response.use(
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

export default workflowApiClient;


