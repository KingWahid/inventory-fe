/**
 * Kong gateway base URL (browser). Must match backend README dev default.
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "http://localhost:8000";
}
