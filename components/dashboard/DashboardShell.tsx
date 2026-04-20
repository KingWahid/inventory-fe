"use client";

import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { useRouter } from "@/i18n/navigation";
import { getMe, logout } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";
import { FiHelpCircle, FiSettings } from "react-icons/fi";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { FiChevronDown, FiMenu, FiX } from "react-icons/fi";

export function DashboardShell({ children }: { children: ReactNode }) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [hydrated, setHydrated] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- zustand persist hydration gate */
  useEffect(() => {
    setHydrated(useAuthStore.persist.hasHydrated());
    return useAuthStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

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

  const loadingShellClass =
    "flex min-h-screen flex-1 items-center justify-center px-4 py-6 text-default-600 sm:px-6 lg:px-8";

  if (!hydrated) {
    return <div className={loadingShellClass}>{t("loadingSession")}</div>;
  }

  if (!accessToken) {
    return (
      <div className={loadingShellClass}>{t("redirectLogin")}</div>
    );
  }

  const me = meQuery.data;
  const displayName = me?.full_name?.trim() || me?.email || "—";
  const tenantLabel = me?.tenant_id
    ? `${t("tenant")} ${me.tenant_id.slice(0, 8)}…`
    : t("tenant");

  return (
    <div className="flex min-h-screen min-w-0 flex-1 bg-[#f7fafc]">
      <aside className="hidden w-[17rem] shrink-0 border-r border-default-200 bg-white md:flex md:flex-col">
        <div className="border-b border-default-100 px-6 py-6">
          <p className="text-4xl font-semibold tracking-tight text-[#02395b]">
            {t("ledgerBrand")}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-default-500">
            {t("ledgerSub")}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <DashboardNav />
        </div>
        <div className="space-y-1 border-t border-default-100 p-3">
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[#5b6b7f] hover:bg-[#f4f8fb]">
            <FiSettings className="size-4" />
            {t("settings")}
          </button>
          <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-[#5b6b7f] hover:bg-[#f4f8fb]">
            <FiHelpCircle className="size-4" />
            {t("support")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-default-200 bg-white px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Button
                aria-label={t("openNav")}
                variant="secondary"
                size="icon-sm"
                className="size-11 shrink-0 md:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                <FiMenu className="size-5" />
              </Button>
              <div className="hidden text-sm text-default-600 lg:flex lg:items-center lg:gap-2">
                <span>{tc("brand")}</span>
                <span>/</span>
                <span className="font-semibold text-[#02395b]">{t("dashboardLabel")}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    {t("user")}
                    <FiChevronDown className="size-4 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    {me?.email ?? "—"}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>{displayName}</DropdownMenuItem>
                  <DropdownMenuItem disabled>{tenantLabel}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="default"
                size="sm"
                className="h-9 px-4"
                onClick={() => logoutMut.mutate()}
                disabled={logoutMut.isPending}
              >
                {logoutMut.isPending ? t("logoutPending") : t("logout")}
              </Button>
            </div>
          </div>
        </header>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[min(18rem,85vw)] p-0">
            <SheetHeader className="border-b border-default-200">
              <SheetTitle className="flex items-center justify-between">
                <span>{t("menu")}</span>
                <Button
                  aria-label={t("closeNav")}
                  variant="ghost"
                  size="icon-sm"
                  className="size-10"
                  onClick={() => setMobileNavOpen(false)}
                >
                  <FiX className="size-5" />
                </Button>
              </SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <DashboardNav onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-h-0 min-w-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
          {meQuery.isError ? (
            <div className="border-b border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700">
              {t("profileLoadFail")}
            </div>
          ) : null}
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
