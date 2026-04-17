import axios, { type AxiosError } from 'axios';

export const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api/v1`,
  timeout: 30_000,
  withCredentials: true,
});

// Request interceptor: add auth, logging, etc.
api.interceptors.request.use(
  (config) => {
    // e.g. attach token: config.headers.Authorization = `Bearer ${getToken()}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize errors, handle 401, etc.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Optional: toast or global error handling
    // if (error.response?.status === 401) { ... }
    return Promise.reject(error);
  }
);

export default api;
