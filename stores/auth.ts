import { create } from "zustand";

/**
 * Minimal session holder for Bearer auth on the axios client (`lib/api/token.ts`).
 *
 * Refresh-token persistence is intentionally out of scope for F2.4: choose later
 * between httpOnly cookies vs localStorage (security vs SPA ergonomics) and
 * document in PR when implemented.
 */
type AuthState = {
  accessToken: string | null;
  setSession: (accessToken: string) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  setSession: (accessToken) => set({ accessToken }),
  clearSession: () => set({ accessToken: null }),
}));
