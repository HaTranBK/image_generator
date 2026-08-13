import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  timeout: 60_000, // 60s — Gemini image calls can take 30s+
  headers: {
    'Content-Type': 'application/json',
  },
  // Required for httpOnly cookie-based auth (session_token cookie)
  withCredentials: true,
});

// Centralised error handling — log + rethrow so React Query surfaces it
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 means cookie is invalid/expired — clear any stale client-side auth state
    if (error.response?.status === 401) {
      // No localStorage to clear — cookie is managed by the browser
      // Let React Query / auth context handle the redirect
    }
    return Promise.reject(error);
  },
);

export default apiClient;
