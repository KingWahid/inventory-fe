import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session-cookie";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Session + Bearer auth (`lib/api/token.ts`).
 *
 * Persisted to localStorage (XSS exposure vs SPA convenience — see F2.4 notes).
 * Both tokens restored on reload; refresh-on-401 uses refresh_token in client.
 */
type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (accessToken: string, refreshToken: string) => void;
  clearSession: () => void;
};

const noopStorage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      setSession: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
        setSessionCookie();
      },
      clearSession: () => {
        set({ accessToken: null, refreshToken: null });
        clearSessionCookie();
      },
    }),
    {
      name: "inventory-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);

type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (listener: () => void) => () => void;
};

function getPersistApi(): PersistApi | null {
  const store = useAuthStore as unknown as { persist?: PersistApi };
  return store.persist ?? null;
}

export function hasAuthHydrated(): boolean {
  const persistApi = getPersistApi();
  if (!persistApi) return true;
  return persistApi.hasHydrated();
}

export function onAuthFinishHydration(listener: () => void): () => void {
  const persistApi = getPersistApi();
  if (!persistApi) {
    listener();
    return () => {};
  }
  return persistApi.onFinishHydration(listener);
}
