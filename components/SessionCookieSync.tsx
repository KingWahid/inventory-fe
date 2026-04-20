"use client";

import { setSessionCookie } from "@/lib/auth/session-cookie";
import { useAuthStore } from "@/stores/auth";
import { useEffect } from "react";

/**
 * After Zustand rehydrate, restore middleware session cookie if tokens exist
 * (e.g. cookie expired but localStorage still has session).
 */
export function SessionCookieSync() {
  useEffect(() => {
    function sync() {
      if (useAuthStore.getState().accessToken) {
        setSessionCookie();
      }
    }
    if (useAuthStore.persist.hasHydrated()) {
      sync();
    }
    return useAuthStore.persist.onFinishHydration(() => {
      sync();
    });
  }, []);
  return null;
}
