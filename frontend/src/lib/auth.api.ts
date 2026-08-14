import apiClient from "../lib/apiClient";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  token?: string;
}

export interface LoginPayload {
  email: string;
  name: string;
}

/**
 * POST /auth/login — upserts user by email, sets httpOnly cookie, returns user info.
 */
export async function login(payload: LoginPayload): Promise<AuthUser> {
  const res = await apiClient.post<AuthUser>("/auth/login", payload);
  return res.data;
}

/**
 * POST /auth/logout — clears the session cookie server-side.
 */
export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

/**
 * GET /auth/me — returns the current authenticated user or throws 401.
 */
export async function getMe(): Promise<AuthUser> {
  const res = await apiClient.get<AuthUser>("/auth/me");
  return res.data;
}
