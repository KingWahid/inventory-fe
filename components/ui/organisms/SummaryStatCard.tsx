"use client";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  value: string;
  loading: boolean;
  tone?: "default" | "danger";
  icon?: ReactNode;
};

export function SummaryStatCard({
  title,
  subtitle,
  value,
  loading,
  tone = "default",
  icon,
}: Props) {
  return (
    <div className="rounded-xl border border-default-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#1e293b]">
          {title}
        </div>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#d9efff] text-sm text-[#0a5a8c]">
          {icon}
        </span>
      </div>
      <div
        className={`mt-3 text-5xl font-semibold leading-none tabular-nums ${tone === "danger" ? "text-danger-700" : "text-[#111827]"}`}
      >
        {loading ? (
          <span className="inline-block h-10 w-16 animate-pulse rounded bg-default-200" />
        ) : (
          value
        )}
      </div>
      {subtitle ? (
        <div
          className={`mt-2 text-sm italic ${tone === "danger" ? "text-danger-500" : "text-default-500"}`}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
