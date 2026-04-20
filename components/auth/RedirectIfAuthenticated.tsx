"use client";

import { setSessionCookie } from "@/lib/auth/session-cookie";
import { useAuthStore } from "@/stores/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** If persisted session exists but middleware cookie missing, restore cookie + go dashboard. */
export function RedirectIfAuthenticated() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated || !accessToken) return;
    setSessionCookie();
    router.replace("/dashboard");
  }, [hydrated, accessToken, router]);

  return null;
}
