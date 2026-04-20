import { apiClient } from "./client";
import type { ApiEnvelopeSuccess } from "./types";

export type LoginBody = {
  email: string;
  password: string;
};

/** §9 success `data` for POST /api/v1/auth/login */
export type LoginData = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

export type RegisterBody = {
  tenant_name: string;
  admin_name: string;
  admin_email: string;
  password: string;
};

/** §9 success `data` for POST /api/v1/auth/register */
export type RegisterData = {
  tenant_id: string;
  user_id: string;
  email: string;
};

export async function login(body: LoginBody): Promise<LoginData> {
  const res = await apiClient.post<ApiEnvelopeSuccess<LoginData>>(
    "/api/v1/auth/login",
    body,
  );
  return res.data.data;
}

export async function register(body: RegisterBody): Promise<RegisterData> {
  const res = await apiClient.post<ApiEnvelopeSuccess<RegisterData>>(
    "/api/v1/auth/register",
    body,
  );
  return res.data.data;
}

export type RefreshBody = {
  refresh_token: string;
};

export type MeData = {
  user_id: string;
  tenant_id: string;
  email: string;
  full_name?: string;
};

export async function refreshTokens(
  body: RefreshBody,
): Promise<LoginData> {
  const res = await apiClient.post<ApiEnvelopeSuccess<LoginData>>(
    "/api/v1/auth/refresh",
    body,
  );
  return res.data.data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/v1/auth/logout");
}

export async function getMe(): Promise<MeData> {
  const res = await apiClient.get<ApiEnvelopeSuccess<MeData>>(
    "/api/v1/auth/me",
  );
  return res.data.data;
}
