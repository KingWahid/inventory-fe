"use client";

import { getMe, logout } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!accessToken) router.replace("/login");
  }, [hydrated, accessToken, router]);

  const meQuery = useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: getMe,
    enabled: hydrated && !!accessToken,
  });

  const logoutMut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearSession();
      router.replace("/login");
    },
  });

  if (!hydrated) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center p-8 text-default-600">
        Memuat sesi…
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center p-8 text-default-600">
        Mengalihkan ke login…
      </div>
    );
  }

  const me = meQuery.data;
  const displayName = me?.full_name?.trim() || me?.email || "—";
  const tenantLabel = me?.tenant_id
    ? `Tenant ${me.tenant_id.slice(0, 8)}…`
    : "Tenant";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-default-200 px-4 py-3 dark:border-default-100">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">Inventory</span>
          <span className="text-default-500">{tenantLabel}</span>
          <span className="text-default-600">{displayName}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-sm text-default-400 underline-offset-4"
            disabled
          >
            Profil
          </button>
          <button
            type="button"
            className="rounded-md bg-default-100 px-3 py-1.5 text-sm font-medium dark:bg-default-50/10"
            onClick={() => logoutMut.mutate()}
            disabled={logoutMut.isPending}
          >
            {logoutMut.isPending ? "Keluar…" : "Keluar"}
          </button>
        </div>
      </header>
      {meQuery.isError ? (
        <div className="border-b border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-300">
          Profil tidak dapat dimuat. Coba muat ulang halaman.
        </div>
      ) : null}
      <div className="flex-1">{children}</div>
    </div>
  );
}
