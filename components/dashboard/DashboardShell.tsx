"use client";

import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { getMe, logout } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
  IconChevronDown,
} from "@heroui/react";
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
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-default-200 px-4 py-3 dark:border-default-100">
        <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">Inventory</span>
          <span className="truncate text-default-500">{tenantLabel}</span>
          <span className="truncate text-default-600">{displayName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Dropdown>
            <DropdownTrigger className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-default-200 bg-default-100 px-3 text-sm font-medium text-default-900 outline-none hover:bg-default-200 data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus dark:border-default-100 dark:bg-default-50/10 dark:text-default-50 dark:hover:bg-default-50/15">
              User
              <IconChevronDown className="size-4 opacity-70" />
            </DropdownTrigger>
            <DropdownPopover placement="bottom end">
              <DropdownMenu aria-label="Menu pengguna">
                <DropdownItem key="email" isDisabled textValue={me?.email ?? ""}>
                  {me?.email ?? "—"}
                </DropdownItem>
                <DropdownItem key="profil" isDisabled textValue="Profil">
                  Profil
                </DropdownItem>
              </DropdownMenu>
            </DropdownPopover>
          </Dropdown>
          <Button
            variant="primary"
            size="sm"
            onPress={() => logoutMut.mutate()}
            isDisabled={logoutMut.isPending}
          >
            {logoutMut.isPending ? "Keluar…" : "Keluar"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1">
        <aside className="w-56 shrink-0 border-r border-default-200 dark:border-default-100">
          <DashboardNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {meQuery.isError ? (
            <div className="border-b border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-300">
              Profil tidak dapat dimuat. Coba muat ulang halaman.
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
