"use client";

import { StockLiveIndicator } from "@/components/dashboard/StockLiveIndicator";
import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { InventorySelect } from "@/components/ui/molecules/InventorySelect";
import { SummaryStatCard } from "@/components/ui/organisms/SummaryStatCard";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import {
  getDashboardMovementsChart,
  getDashboardSummary,
  type DashboardChartPeriod,
} from "@/lib/api/dashboard";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const STALE_MS = 30_000;

function formatNum(n: number, locale: string): string {
  const tag = locale === "en" ? "en-US" : "id-ID";
  return n.toLocaleString(tag);
}

function shortBucketLabel(
  isoDate: string,
  period: DashboardChartPeriod,
  locale: string,
): string {
  const tag = locale === "en" ? "en-US" : "id-ID";
  try {
    const d = new Date(isoDate + (isoDate.includes("T") ? "" : "T00:00:00Z"));
    if (Number.isNaN(d.getTime())) return isoDate.slice(0, 10);
    if (period === "monthly") {
      return d.toLocaleDateString(tag, { month: "short", year: "2-digit" });
    }
    if (period === "weekly") {
      return d.toLocaleDateString(tag, { day: "numeric", month: "short" });
    }
    return d.toLocaleDateString(tag, { day: "numeric", month: "short" });
  } catch {
    return isoDate.slice(0, 10);
  }
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [period, setPeriod] = useState<DashboardChartPeriod>("daily");

  const PERIOD_OPTIONS: { value: DashboardChartPeriod; label: string }[] = useMemo(
    () => [
      { value: "daily", label: t("periodDaily") },
      { value: "weekly", label: t("periodWeekly") },
      { value: "monthly", label: t("periodMonthly") },
    ],
    [t],
  );

  const summaryQuery = useQuery({
    queryKey: queryKeys.inventory.dashboard.summary(),
    queryFn: getDashboardSummary,
    staleTime: STALE_MS,
  });

  const chartQuery = useQuery({
    queryKey: queryKeys.inventory.dashboard.movementsChart({ period }),
    queryFn: () => getDashboardMovementsChart(period),
    staleTime: STALE_MS,
  });

  const summary = summaryQuery.data;
  const chart = chartQuery.data;

  const maxCount = useMemo(() => {
    const pts = chart?.points ?? [];
    if (pts.length === 0) return 1;
    return Math.max(1, ...pts.map((p) => p.movement_count));
  }, [chart?.points]);

  const chartError = summaryQuery.error ?? chartQuery.error;
  const chartLoading = chartQuery.isLoading;

  return (
    <DashboardPageTemplate>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-default-600">{t("cacheHint")}</p>
        </div>
        <StockLiveIndicator />
      </div>

      {chartError ? (
        <ApiErrorAlert title={t("loadFail")}>
          {userFacingApiMessage(chartError)}
        </ApiErrorAlert>
      ) : null}

      <section>
        <h2 className="sr-only">{t("summaryCardsTitle")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryStatCard
            title={t("products")}
            subtitle={t("productsSub")}
            value={
              summary ? formatNum(summary.total_products, locale) : "—"
            }
            loading={summaryQuery.isLoading}
          />
          <SummaryStatCard
            title={t("movement")}
            subtitle={t("movementSub")}
            value={
              summary ? formatNum(summary.movements_today, locale) : "—"
            }
            loading={summaryQuery.isLoading}
          />
          <SummaryStatCard
            title={t("lowStock")}
            subtitle={t("lowStockSub")}
            value={
              summary ? formatNum(summary.low_stock_count, locale) : "—"
            }
            loading={summaryQuery.isLoading}
          />
          <SummaryStatCard
            title={t("warehouses")}
            subtitle={t("warehousesSub")}
            value={
              summary ? formatNum(summary.total_warehouses, locale) : "—"
            }
            loading={summaryQuery.isLoading}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold">{t("chartTitle")}</h2>
          <InventorySelect
            label={t("periodLabel")}
            className="w-full min-w-[12rem] sm:w-auto"
            placeholder={t("periodPlaceholder")}
            items={PERIOD_OPTIONS.map((o) => ({
              id: o.value,
              label: o.label,
            }))}
            value={period}
            onChange={(id) => setPeriod(id as DashboardChartPeriod)}
          />
        </div>

        <div className="rounded-lg border border-default-200 bg-background p-4 dark:border-default-100">
          {chartLoading ? (
            <div className="flex h-48 items-end gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-0 flex-1 animate-pulse rounded-t bg-default-200 dark:bg-default-800"
                  style={{ height: `${20 + (i % 5) * 12}%` }}
                />
              ))}
            </div>
          ) : chart && chart.points.length > 0 ? (
            <div className="overflow-x-auto pb-6">
              <div className="flex min-h-[220px] min-w-[480px] items-end gap-1 pt-2">
                {chart.points.map((p, i) => {
                  const barPx = Math.max(
                    4,
                    Math.round((p.movement_count / maxCount) * 168),
                  );
                  return (
                    <div
                      key={`${p.bucket_start}-${i}`}
                      className="flex min-w-[24px] flex-1 flex-col items-center justify-end"
                    >
                      <span className="mb-1 text-[10px] tabular-nums text-default-600">
                        {p.movement_count}
                      </span>
                      <div
                        className="w-full max-w-full rounded-t bg-primary/80 dark:bg-primary/60"
                        style={{ height: barPx }}
                        title={`${p.bucket_start}: ${p.movement_count}`}
                      />
                      <span className="mt-2 max-w-[4rem] truncate text-center text-[10px] text-default-500">
                        {shortBucketLabel(p.bucket_start, chart.period, locale)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-default-500">
              {t("chartEmpty")}
            </p>
          )}
        </div>
      </section>
    </DashboardPageTemplate>
  );
}
