"use client";

import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getMe, logout } from "@/lib/api/auth";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";
import {
  Button,
  CloseIcon,
  Drawer,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
  IconChevronDown,
  useOverlayState,
} from "@heroui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  type ReactNode,
  type SVGProps,
  useEffect,
  useState,
} from "react";

function MenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      {...props}
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const t = useTranslations("shell");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  const mobileNav = useOverlayState();

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

  useEffect(() => {
    mobileNav.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close drawer on route change only
  }, [pathname]);

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
    "flex min-h-full flex-1 items-center justify-center px-4 py-6 text-default-600 sm:px-6 lg:px-8";

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
    <div className="flex min-h-full min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-default-200 px-4 py-3 dark:border-default-100">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-sm md:gap-3">
          <Button
            aria-label={t("openNav")}
            variant="secondary"
            size="sm"
            className="min-h-11 min-w-11 shrink-0 px-0 md:hidden"
            onPress={mobileNav.open}
          >
            <MenuIcon />
          </Button>
          <span className="font-semibold">{tc("brand")}</span>
          <span className="hidden truncate text-default-500 sm:inline">
            {tenantLabel}
          </span>
          <span className="hidden truncate text-default-600 sm:inline">
            {displayName}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <LocaleSwitcher />
          <Dropdown>
            <DropdownTrigger className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-md border border-default-200 bg-default-100 px-3 text-sm font-medium text-default-900 outline-none hover:bg-default-200 data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus dark:border-default-100 dark:bg-default-50/10 dark:text-default-50 dark:hover:bg-default-50/15 sm:min-h-8">
              {t("user")}
              <IconChevronDown className="size-4 opacity-70" />
            </DropdownTrigger>
            <DropdownPopover placement="bottom end">
              <DropdownMenu aria-label={t("userMenu")}>
                <DropdownItem key="email" isDisabled textValue={me?.email ?? ""}>
                  {me?.email ?? "—"}
                </DropdownItem>
                <DropdownItem key="profil" isDisabled textValue={t("profile")}>
                  {t("profile")}
                </DropdownItem>
              </DropdownMenu>
            </DropdownPopover>
          </Dropdown>
          <Button
            variant="primary"
            size="sm"
            className="min-h-11 sm:min-h-8"
            onPress={() => logoutMut.mutate()}
            isDisabled={logoutMut.isPending}
          >
            {logoutMut.isPending ? t("logoutPending") : t("logout")}
          </Button>
        </div>
      </header>

      <Drawer state={mobileNav}>
        <Drawer.Backdrop />
        <Drawer.Content
          placement="left"
          className="w-[min(18rem,85vw)] data-[placement=left]:max-h-full"
        >
          <Drawer.Dialog className="flex h-[100dvh] max-h-[100dvh] flex-col rounded-none outline-none">
            <div className="flex items-center justify-between border-b border-default-200 px-4 py-3 dark:border-default-100">
              <span className="font-semibold">{t("menu")}</span>
              <Button
                aria-label={t("closeNav")}
                variant="secondary"
                size="sm"
                className="min-h-11 min-w-11 px-0"
                onPress={mobileNav.close}
              >
                <CloseIcon className="size-5" />
              </Button>
            </div>
            <Drawer.Body className="min-h-0 flex-1 overflow-y-auto p-0">
              <DashboardNav onNavigate={mobileNav.close} />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer>

      <div className="flex min-h-0 min-w-0 flex-1">
        <aside className="hidden w-56 shrink-0 border-r border-default-200 md:block dark:border-default-100">
          <DashboardNav />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          {meQuery.isError ? (
            <div className="border-b border-danger-200 bg-danger-50 px-4 py-2 text-sm text-danger-700 dark:border-danger-900 dark:bg-danger-950/40 dark:text-danger-300">
              {t("profileLoadFail")}
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
