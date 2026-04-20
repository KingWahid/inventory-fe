import { getApiBaseUrl } from "./env";

/**
 * Browser EventSource cannot send Authorization; backend accepts `access_token` query.
 */
export function buildActivitySseUrl(accessToken: string): string {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  const q = new URLSearchParams({
    access_token: accessToken,
  });
  return `${base}/api/v1/inventory/sse/activity?${q.toString()}`;
}
