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

import { ApiClientError } from "./errors";
import { getApiBaseUrl } from "./env";
import { getAccessToken } from "./token";
import type { ApiEnvelopeFail } from "./types";

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

function attachBearer(config: InternalAxiosRequestConfig): void {
  const token = getAccessToken();
  if (!token) return;
  const headers = AxiosHeaders.from(config.headers ?? {});
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
  (response) => {
    const ct = response.headers["content-type"];
    const { data } = response;
    if (!isJsonLikeContentType(ct)) return response;
    const rejected = rejectIfEnvelopeFailure(data, response.status);
    if (rejected) return rejected;
    return response;
  },
  (error: unknown) => {
    if (isAxiosError(error)) {
      return Promise.reject(normalizeAxiosError(error));
    }
    return Promise.reject(
      ApiClientError.network(
        error instanceof Error ? error.message : "Unknown error",
        error,
      ),
    );
  },
);
