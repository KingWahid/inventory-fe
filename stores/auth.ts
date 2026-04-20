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
      setSession: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),
      clearSession: () => set({ accessToken: null, refreshToken: null }),
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
