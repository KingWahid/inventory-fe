"use client";

import { setSessionCookie } from "@/lib/auth/session-cookie";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "@/i18n/navigation";
import { useEffect, useState } from "react";

/** If persisted session exists but middleware cookie missing, restore cookie + go dashboard. */
export function RedirectIfAuthenticated() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- zustand persist hydration gate */
  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    setSessionCookie();
    router.replace("/dashboard");
  }, [hydrated, accessToken, router]);

  return null;
}
