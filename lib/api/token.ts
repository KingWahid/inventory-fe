import { useAuthStore } from "@/stores/auth";

/** Sync getter for axios interceptors — do not use React hooks here. */

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function getRefreshToken(): string | null {
  return useAuthStore.getState().refreshToken;
}
