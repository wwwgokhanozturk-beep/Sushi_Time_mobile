import axios from 'axios';
import { ApiConstants } from './api';

const httpClient = axios.create({
  baseURL: ApiConstants.baseUrl,
  timeout: ApiConstants.connectTimeout,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token from profile store on every request
httpClient.interceptors.request.use((config) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { useProfileStore } = require('../store/profileStore');
  const token = useProfileStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Clear auth on 401 (expired/invalid token)
httpClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useProfileStore } = require('../store/profileStore');
      const { token, logout } = useProfileStore.getState();
      // Only force-logout if the user actually had a token (not a failed login attempt)
      if (token) logout().catch(() => {});
    }
    return Promise.reject(err);
  }
);

export default httpClient;
