/**
 * Axios client for REST JSON §9 through Kong.
 * SSE / EventSource stays outside this module (browser streaming).
 */

import axios, {
  AxiosHeaders,
  isAxiosError,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "@/stores/auth";

import type { LoginData } from "./auth";

import { ApiClientError } from "./errors";

import { getApiBaseUrl } from "./env";

import { getAccessToken, getRefreshToken } from "./token";

import type { ApiEnvelopeFail, ApiEnvelopeSuccess } from "./types";

function isJsonLikeContentType(ct: unknown): boolean {
  const s =
    typeof ct === "string"
      ? ct
      : Array.isArray(ct)
        ? ct.join(", ")
        : String(ct ?? "");
  return s.includes("application/json") || s.includes("+json");
}

function isEnvelopeObject(data: unknown): data is { success: boolean } {
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    "success" in data
  );
}

function attachRequestId(config: InternalAxiosRequestConfig): void {
  const headers = AxiosHeaders.from(config.headers ?? {});
  if (!headers.has("X-Request-Id") && typeof crypto !== "undefined") {
    headers.set("X-Request-Id", crypto.randomUUID());
  }
  config.headers = headers;
}

function pathFromConfig(config: InternalAxiosRequestConfig): string {
  const u = config.url ?? "";
  if (u.startsWith("http")) return u;
  const base = config.baseURL ?? "";
  return `${base}${u}`;
}

function isRefreshRequest(config: InternalAxiosRequestConfig): boolean {
  return pathFromConfig(config).includes("/api/v1/auth/refresh");
}

function attachBearer(config: InternalAxiosRequestConfig): void {
  const headers = AxiosHeaders.from(config.headers ?? {});
  if (isRefreshRequest(config)) {
    headers.delete("Authorization");
    config.headers = headers;
    return;
  }
  const token = getAccessToken();
  if (!token) return;
  if (!headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  config.headers = headers;
}

function rejectIfEnvelopeFailure(
  data: unknown,
  status: number,
): Promise<never> | null {
  if (!isEnvelopeObject(data)) return null;
  if (data.success !== false) return null;
  return Promise.reject(
    ApiClientError.fromEnvelope(data as ApiEnvelopeFail, status),
  );
}

function isAuthFailureEnvelope(data: unknown): data is ApiEnvelopeFail {
  if (!isEnvelopeObject(data) || data.success !== false) return false;
  const envelope = data as ApiEnvelopeFail;
  const code = envelope.error?.code?.toUpperCase?.() ?? "";
  if (!code) return false;
  return (
    code.includes("UNAUTHORIZED") ||
    code.includes("TOKEN") ||
    code.includes("AUTH")
  );
}

function normalizeAxiosError(error: AxiosError): ApiClientError {
  const status = error.response?.status;
  const data = error.response?.data;

  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    (data as { success: boolean }).success === false
  ) {
    return ApiClientError.fromEnvelope(data as ApiEnvelopeFail, status);
  }

  if (error.code === "ERR_NETWORK" || error.message === "Network Error") {
    return ApiClientError.network(error.message, error);
  }

  return ApiClientError.http(
    status ?? 0,
    error.message || "Request failed",
  );
}

/** Raw refresh avoids importing this module while it is still initializing. */
let refreshInflight: Promise<void> | null = null;

async function refreshSessionFromStore(): Promise<void> {
  const rt = getRefreshToken();
  if (!rt) {
    throw new ApiClientError({
      code: "NO_REFRESH",
      message: "No refresh token",
    });
  }

  const base = getApiBaseUrl().replace(/\/$/, "");
  const res = await axios.post<
    ApiEnvelopeSuccess<LoginData> | ApiEnvelopeFail
  >(
    `${base}/api/v1/auth/refresh`,
    { refresh_token: rt },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      validateStatus: (s) => s === 200,
    },
  );

  const payload = res.data;
  if (
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    payload.success === false
  ) {
    throw ApiClientError.fromEnvelope(payload as ApiEnvelopeFail, 401);
  }
  const ok = payload as ApiEnvelopeSuccess<LoginData>;
  if (!ok.data?.access_token || !ok.data?.refresh_token) {
    throw new ApiClientError({
      code: "INVALID_REFRESH_RESPONSE",
      message: "Invalid refresh response",
    });
  }
  useAuthStore.getState().setSession(ok.data.access_token, ok.data.refresh_token);
}

function refreshSessionSingleFlight(): Promise<void> {
  if (!refreshInflight) {
    refreshInflight = refreshSessionFromStore().finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
}

function shouldSkip401Refresh(url: string): boolean {
  return (
    url.includes("/api/v1/auth/login") ||
    url.includes("/api/v1/auth/register") ||
    url.includes("/api/v1/auth/refresh")
  );
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    Accept: "application/json, text/plain, */*",
  },
});

apiClient.interceptors.request.use((config) => {
  attachRequestId(config);
  attachBearer(config);
  return config;
});

apiClient.interceptors.response.use(
  async (response) => {
    if (response.status === 204) return response;
    const ct = response.headers["content-type"];
    const { data } = response;
    if (!isJsonLikeContentType(ct)) return response;
    if (
      isAuthFailureEnvelope(data) &&
      !shouldSkip401Refresh(response.config.url ?? "") &&
      !isRefreshRequest(response.config)
    ) {
      const cfg = response.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };
      if (!cfg._retry && getRefreshToken()) {
        cfg._retry = true;
        try {
          await refreshSessionSingleFlight();
          return apiClient.request(cfg);
        } catch {
          useAuthStore.getState().clearSession();
        }
      }
    }
    const rejected = rejectIfEnvelopeFailure(data, response.status);
    if (rejected) return rejected;
    return response;
  },
  async (error: unknown) => {
    if (!isAxiosError(error) || error.config == null) {
      if (isAxiosError(error)) {
        return Promise.reject(normalizeAxiosError(error));
      }
      return Promise.reject(
        ApiClientError.network(
          error instanceof Error ? error.message : "Unknown error",
          error,
        ),
      );
    }

    const config = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const url = config.url ?? "";
    const status = error.response?.status;

    if (
      status === 401 &&
      !config._retry &&
      !shouldSkip401Refresh(url) &&
      !isRefreshRequest(config)
    ) {
      const rt = getRefreshToken();
      if (rt) {
        config._retry = true;
        try {
          await refreshSessionSingleFlight();
          return apiClient.request(config);
        } catch {
          useAuthStore.getState().clearSession();
        }
      }
    }

    return Promise.reject(normalizeAxiosError(error));
  },
);
