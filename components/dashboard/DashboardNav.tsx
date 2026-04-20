"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { FiBarChart2, FiBox, FiGrid, FiLayers, FiRepeat, FiShield } from "react-icons/fi";
import { useTranslations } from "next-intl";

function linkClass(active: boolean): string {
  return [
    "group relative flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors sm:min-h-0",
    active
      ? "bg-[#e9f5ff] font-semibold text-[#02395b]"
      : "text-[#425466] hover:bg-[#f4f8fb]",
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
  const iconClass = "size-4 shrink-0";

  return (
    <nav className="flex flex-col gap-2 p-3" aria-label={t("main")}>
      <Link
        href="/dashboard"
        className={linkClass(dashActive)}
        onClick={() => onNavigate?.()}
      >
        <FiGrid className={iconClass} />
        {t("dashboard")}
        {dashActive ? <span className="ml-auto h-6 w-0.5 rounded-full bg-[#0a5a8c]" /> : null}
      </Link>

      <div className="px-3 pt-3 text-xs font-semibold uppercase tracking-[0.16em] text-default-400">
        {t("master")}
      </div>
      <Link
        href="/inventory/categories"
        className={`${linkClass(catActive)} pl-6`}
        onClick={() => onNavigate?.()}
      >
        <FiLayers className={iconClass} />
        {t("categories")}
      </Link>
      <Link
        href="/inventory/products"
        className={`${linkClass(prodActive)} pl-6`}
        onClick={() => onNavigate?.()}
      >
        <FiBox className={iconClass} />
        {t("products")}
      </Link>
      <Link
        href="/inventory/warehouses"
        className={`${linkClass(whActive)} pl-6`}
        onClick={() => onNavigate?.()}
      >
        <FiBarChart2 className={iconClass} />
        {t("warehouses")}
      </Link>

      <Link
        href="/inventory/movements"
        className={linkClass(movActive)}
        onClick={() => onNavigate?.()}
      >
        <FiRepeat className={iconClass} />
        {t("movements")}
      </Link>
      <Link
        href="/inventory/audit"
        className={linkClass(auditActive)}
        onClick={() => onNavigate?.()}
      >
        <FiShield className={iconClass} />
        {t("audit")}
      </Link>
    </nav>
  );
}
