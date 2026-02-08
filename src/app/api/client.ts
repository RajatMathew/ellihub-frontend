import axios, { type AxiosError } from "axios";

const baseURL =
  typeof import.meta.env.VITE_API_BASE_URL === "string" &&
  import.meta.env.VITE_API_BASE_URL.length > 0
    ? import.meta.env.VITE_API_BASE_URL
    : "/api";

export const api = axios.create({
  baseURL,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor: add auth, logging, etc.
api.interceptors.request.use(
  (config) => {
    // e.g. attach token: config.headers.Authorization = `Bearer ${getToken()}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: normalize errors, handle 401, etc.
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Optional: toast or global error handling
    // if (error.response?.status === 401) { ... }
    return Promise.reject(error);
  },
);

export default api;
