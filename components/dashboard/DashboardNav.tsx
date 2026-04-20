"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

function linkClass(active: boolean): string {
  return [
    "block min-h-11 rounded-md px-3 py-2 text-sm transition-colors sm:min-h-0",
    active
      ? "bg-primary/15 font-medium text-primary"
      : "text-default-700 hover:bg-default-100 dark:text-default-300 dark:hover:bg-default-50/10",
  ].join(" ");
}

type Props = {
  onNavigate?: () => void;
};

export function DashboardNav({ onNavigate }: Props) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const dashActive = pathname === "/dashboard";
  const catActive = pathname === "/inventory/categories";
  const prodActive = pathname === "/inventory/products";
  const whActive = pathname === "/inventory/warehouses";
  const movActive =
    pathname === "/inventory/movements" ||
    pathname.startsWith("/inventory/movements/");
  const auditActive = pathname === "/inventory/audit";

  return (
    <nav className="flex flex-col gap-1 p-3" aria-label={t("main")}>
      <Link
        href="/dashboard"
        className={linkClass(dashActive)}
        onClick={() => onNavigate?.()}
      >
        {t("dashboard")}
      </Link>

      <div className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-default-500">
        {t("master")}
      </div>
      <Link
        href="/inventory/categories"
        className={`${linkClass(catActive)} pl-6`}
        onClick={() => onNavigate?.()}
      >
        {t("categories")}
      </Link>
      <Link
        href="/inventory/products"
        className={`${linkClass(prodActive)} pl-6`}
        onClick={() => onNavigate?.()}
      >
        {t("products")}
      </Link>
      <Link
        href="/inventory/warehouses"
        className={`${linkClass(whActive)} pl-6`}
        onClick={() => onNavigate?.()}
      >
        {t("warehouses")}
      </Link>

      <Link
        href="/inventory/movements"
        className={linkClass(movActive)}
        onClick={() => onNavigate?.()}
      >
        {t("movements")}
      </Link>
      <Link
        href="/inventory/audit"
        className={linkClass(auditActive)}
        onClick={() => onNavigate?.()}
      >
        {t("audit")}
      </Link>
    </nav>
  );
}
