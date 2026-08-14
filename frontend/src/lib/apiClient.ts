import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  timeout: 60_000, // 60s — Gemini image calls can take 30s+
  headers: {
    "Content-Type": "application/json",
  },
  // Required for httpOnly cookie-based auth (session_token cookie)
  withCredentials: true,
});

// Centralised request interceptor to add token header
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Centralised error handling — log + rethrow so React Query surfaces it
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 means token is invalid/expired — clear local state
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
