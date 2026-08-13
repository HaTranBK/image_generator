import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  timeout: 60_000, // 60s — Gemini image calls can take 30s+
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach session token from localStorage (set on login)
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('session_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Centralised error handling — log + rethrow so React Query surfaces it
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('session_token');
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
