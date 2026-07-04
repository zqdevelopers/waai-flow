const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, '');

export { API_BASE_URL, SOCKET_URL };
