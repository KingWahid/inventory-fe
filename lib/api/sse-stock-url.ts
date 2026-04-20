import { getApiBaseUrl } from "./env";

/**
 * Browser EventSource cannot send Authorization; backend accepts `access_token` query.
 * Use HTTPS in production when passing JWT in the URL (see ARCHITECTURE §SSE).
 */
export function buildStockSseUrl(accessToken: string): string {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  const q = new URLSearchParams({
    access_token: accessToken,
  });
  return `${base}/api/v1/inventory/sse/stock?${q.toString()}`;
}
