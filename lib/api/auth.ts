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
