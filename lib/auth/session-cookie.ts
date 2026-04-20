import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie.constants";

/**
 * Opaque logged-in marker (no JWT payload in cookie).
 * Axios still uses Bearer from Zustand.
 */
export function setSessionCookie(): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  const parts = [
    `${SESSION_COOKIE_NAME}=1`,
    "path=/",
    "SameSite=Lax",
    // Long-lived; SPA session still bounded by backend tokens + refresh/logout.
    `Max-Age=${60 * 60 * 24 * 7}`,
  ];
  if (secure) parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function clearSessionCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE_NAME}=; path=/; SameSite=Lax; Max-Age=0`;
}
