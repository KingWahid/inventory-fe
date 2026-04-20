import { apiClient } from "./client";

/** Plaintext probes — not §9 JSON (backend ARCHITECTURE). */

export async function getInventoryHealth(): Promise<string> {
  const res = await apiClient.get<string>("/api/v1/inventory/health", {
    responseType: "text",
  });
  if (res.status !== 200) {
    throw new Error(`inventory health: HTTP ${res.status}`);
  }
  return res.data;
}

export async function getAuthHealth(): Promise<string> {
  const res = await apiClient.get<string>("/api/v1/auth/health", {
    responseType: "text",
  });
  if (res.status !== 200) {
    throw new Error(`auth health: HTTP ${res.status}`);
  }
  return res.data;
}
