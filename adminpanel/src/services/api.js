import axios from 'axios';

/**
 * Shared axios instance for every admin-panel API call.
 *
 * The backend now requires a valid ADMIN JWT on most admin-only endpoints
 * (previously it required nothing at all, and this app never sent a token to
 * begin with). This instance attaches `adminToken` from sessionStorage to
 * every outgoing request automatically, so individual service files and
 * pages don't each need to remember to do it.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
