import axios from 'axios';
import { API_BASE_URL } from './config';

export const authStorageKey = 'waai.auth.token';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(authStorageKey);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(authStorageKey);
      window.dispatchEvent(new Event('waai:auth-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
