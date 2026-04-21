"use client";

import { StockLiveIndicator } from "@/components/dashboard/StockLiveIndicator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { SummaryStatCard } from "@/components/ui/organisms/SummaryStatCard";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import { listAuditLogs } from "@/lib/api/audit";
import {
  getDashboardMovementsChart,
  getDashboardStorageUtilization,
  getDashboardSummary,
  type DashboardChartPeriod,
} from "@/lib/api/dashboard";
import { getMovement, listMovements } from "@/lib/api/movements";
import { listProducts } from "@/lib/api/products";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { FiAlertTriangle, FiHome, FiPackage, FiRepeat } from "react-icons/fi";

const STALE_MS = 30_000;
const chartConfig = {
  movements: {
    label: "Movements",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

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
  const [period, setPeriod] = useState<DashboardChartPeriod>("weekly");

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

  const storageUtilizationQuery = useQuery({
    queryKey: queryKeys.inventory.dashboard.storageUtilization({ limit: 3 }),
    queryFn: () => getDashboardStorageUtilization(3),
    staleTime: STALE_MS,
  });

  const productsQuery = useQuery({
    queryKey: queryKeys.inventory.products.list({
      page: 1,
      per_page: 100,
      sort: "reorder_level",
      order: "desc",
    }),
    queryFn: () =>
      listProducts({
        page: 1,
        per_page: 100,
        sort: "reorder_level",
        order: "desc",
      }),
    staleTime: STALE_MS,
  });

  const recentMovementsQuery = useQuery({
    queryKey: queryKeys.inventory.movements.list({
      page: 1,
      per_page: 10,
      status: "confirmed",
      sort: "updated_at",
      order: "desc",
    }),
    queryFn: () =>
      listMovements({
        page: 1,
        per_page: 10,
        status: "confirmed",
        sort: "updated_at",
        order: "desc",
      }),
    staleTime: STALE_MS,
  });

  const movementDetailsQuery = useQuery({
    queryKey: [
      ...queryKeys.inventory.dashboard.warehouseActivity(),
      "movementDetails",
      (recentMovementsQuery.data?.data ?? []).map((m) => m.id),
    ] as const,
    queryFn: async () => {
      const ids = (recentMovementsQuery.data?.data ?? []).map((m) => m.id);
      const details = await Promise.all(ids.map((id) => getMovement(id)));
      return details;
    },
    enabled: (recentMovementsQuery.data?.data?.length ?? 0) > 0,
    staleTime: STALE_MS,
  });

  const activityQuery = useQuery({
    queryKey: queryKeys.inventory.dashboard.auditActivity(),
    queryFn: async () => {
      const { data } = await listAuditLogs({ page: 1, per_page: 5 });
      return data;
    },
    staleTime: STALE_MS,
  });

  const summary = summaryQuery.data;
  const chart = chartQuery.data;

  const chartData = useMemo(
    () =>
      (chart?.points ?? []).map((p) => ({
        bucket: shortBucketLabel(p.bucket_start, chart?.period ?? period, locale),
        movements: p.movement_count,
      })),
    [chart, locale, period],
  );

  const chartTrend = useMemo(() => {
    if (chartData.length < 2) return null;
    const last = chartData[chartData.length - 1]?.movements ?? 0;
    const prev = chartData[chartData.length - 2]?.movements ?? 0;
    if (prev === 0) return null;
    const pct = ((last - prev) / prev) * 100;
    return {
      up: pct >= 0,
      percent: Math.abs(pct).toFixed(1),
    };
  }, [chartData]);

  const chartError = summaryQuery.error ?? chartQuery.error;
  const chartLoading = chartQuery.isLoading;

  const lowStockAlerts = useMemo(
    () =>
      (productsQuery.data?.data ?? [])
        .filter((p) => (p.reorder_level ?? 0) > 0)
        .slice(0, 3),
    [productsQuery.data?.data],
  );

  const topMovingProducts = useMemo(() => {
    const byProduct = new Map<string, number>();
    for (const movement of movementDetailsQuery.data ?? []) {
      for (const line of movement.lines ?? []) {
        const qty = Math.max(0, Number(line.quantity) || 0);
        byProduct.set(line.product_id, (byProduct.get(line.product_id) ?? 0) + qty);
      }
    }
    const productNameById = new Map(
      (productsQuery.data?.data ?? []).map((p) => [p.id, p.name]),
    );
    return Array.from(byProduct.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([productId, volume], index, arr) => {
        const prev = arr[index + 1]?.[1] ?? volume;
        const trend = prev > 0 ? ((volume - prev) / prev) * 100 : 0;
        return {
          productId,
          name: productNameById.get(productId) ?? productId.slice(0, 8),
          volume,
          trend,
        };
      });
  }, [movementDetailsQuery.data, productsQuery.data?.data]);

  function formatEventTime(iso: string) {
    const ts = new Date(iso).getTime();
    if (!Number.isFinite(ts)) return "—";
    return new Date(ts).toLocaleString(locale === "en" ? "en-US" : "id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <DashboardPageTemplate>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-5xl font-semibold tracking-tight text-[#02395b]">{t("title")}</h1>
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
            icon={<FiPackage className="size-4" />}
          />
          <SummaryStatCard
            title={t("movement")}
            subtitle={t("movementSub")}
            value={
              summary ? formatNum(summary.movements_today, locale) : "—"
            }
            loading={summaryQuery.isLoading}
            icon={<FiRepeat className="size-4" />}
          />
          <SummaryStatCard
            title={t("lowStock")}
            subtitle={t("lowStockSub")}
            value={
              summary ? formatNum(summary.low_stock_count, locale) : "—"
            }
            loading={summaryQuery.isLoading}
            tone="danger"
            icon={<FiAlertTriangle className="size-4" />}
          />
          <SummaryStatCard
            title={t("warehouses")}
            subtitle={t("warehousesSub")}
            value={
              summary ? formatNum(summary.total_warehouses, locale) : "—"
            }
            loading={summaryQuery.isLoading}
            icon={<FiHome className="size-4" />}
          />
        </div>
      </section>

      <section>
        <Card className="border-default-200">
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl font-semibold tracking-tight text-[#02395b]">
                {t("chartTitle")}
              </CardTitle>
              <CardDescription className="mt-1">{t("chartSubtitle")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${period === "daily" ? "bg-[#02395b] text-white" : "bg-default-100 text-default-700"}`}
                onClick={() => setPeriod("daily")}
              >
                {t("periodDaily")}
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${period === "weekly" ? "bg-[#02395b] text-white" : "bg-default-100 text-default-700"}`}
                onClick={() => setPeriod("weekly")}
              >
                {t("periodWeekly")}
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${period === "monthly" ? "bg-[#02395b] text-white" : "bg-default-100 text-default-700"}`}
                onClick={() => setPeriod("monthly")}
              >
                {t("periodMonthly")}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <div className="flex h-60 items-end gap-1">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="min-w-0 flex-1 animate-pulse rounded-t bg-default-200"
                    style={{ height: `${20 + (i % 5) * 12}%` }}
                  />
                ))}
              </div>
            ) : chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-60 w-full">
                <BarChart accessibilityLayer data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar dataKey="movements" fill="var(--color-movements)" radius={8} />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="py-8 text-center text-sm text-default-500">
                {t("chartEmpty")}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex-col items-start gap-2 text-sm">
            {chartTrend ? (
              <div className="flex items-center gap-2 font-medium">
                Trending {chartTrend.up ? "up" : "down"} by {chartTrend.percent}%
                <FiRepeat className="h-4 w-4" />
              </div>
            ) : null}
            <div className="text-muted-foreground">
              {period === "daily"
                ? t("periodDaily")
                : period === "weekly"
                  ? t("periodWeekly")
                  : t("periodMonthly")}
            </div>
          </CardFooter>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-default-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1f2937]">
                {t("lowStockAlertsTitle")}
              </h3>
              <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-semibold text-[#b91c1c]">
                {summary ? `${summary.low_stock_count} ${t("criticalBadge")}` : t("criticalBadge")}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              {productsQuery.isLoading ? (
                <p className="text-sm text-default-500">{t("activityLoading")}</p>
              ) : lowStockAlerts.length === 0 ? (
                <p className="text-sm text-default-500">{t("panelEmpty")}</p>
              ) : (
                lowStockAlerts.map((product, idx) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border border-default-200 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{product.name}</p>
                      <p className="text-xs text-default-500">
                        {t("reorderLevelLabel")} {product.reorder_level ?? 0}
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-2 w-2 rounded-full ${
                        idx === 0
                          ? "bg-[#ef4444]"
                          : idx === 1
                            ? "bg-[#f59e0b]"
                            : "bg-[#9ca3af]"
                      }`}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-default-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1f2937]">
                {t("storageUtilizationTitle")}
              </h3>
              <span className="text-xs text-default-500">{t("estimatedLabel")}</span>
            </div>
            <div className="mt-4 space-y-4">
              {storageUtilizationQuery.isLoading ? (
                <p className="text-sm text-default-500">{t("activityLoading")}</p>
              ) : (storageUtilizationQuery.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-default-500">{t("panelEmpty")}</p>
              ) : (
                storageUtilizationQuery.data?.map((row) => (
                  <div key={row.warehouse_id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[#374151]">{row.warehouse_name}</span>
                      <span className="font-semibold text-[#111827]">{row.percent}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-default-100">
                      <div
                        className="h-2 rounded-full bg-[#111827]"
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-default-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1f2937]">
                {t("topMovingProductsTitle")}
              </h3>
              <span className="text-xs font-semibold text-default-500">{t("last7dLabel")}</span>
            </div>
            <div className="mt-4 space-y-2">
              {movementDetailsQuery.isLoading ? (
                <p className="text-sm text-default-500">{t("activityLoading")}</p>
              ) : topMovingProducts.length === 0 ? (
                <p className="text-sm text-default-500">{t("panelEmpty")}</p>
              ) : (
                topMovingProducts.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{item.name}</p>
                      <p className="text-xs text-default-500">{t("volumeLabel")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#111827]">{item.volume}</p>
                      <p
                        className={`text-xs font-semibold ${
                          item.trend >= 0 ? "text-[#059669]" : "text-[#dc2626]"
                        }`}
                      >
                        {item.trend >= 0 ? "+" : ""}
                        {Math.abs(item.trend).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-default-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[#1f2937]">
              {t("recentActivityLogTitle")}
            </h3>
          </div>
          <div className="mt-4 space-y-3">
            {activityQuery.isLoading ? (
              <p className="text-sm text-default-500">{t("activityLoading")}</p>
            ) : (activityQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-default-500">{t("panelEmpty")}</p>
            ) : (
              activityQuery.data?.slice(0, 3).map((row) => (
                <div key={row.id} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[#111827]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#111827]">
                      {row.action.toLowerCase()}{" "}
                      <span className="font-semibold text-[#2563eb]">{row.entity}</span>
                    </p>
                    <p className="text-xs text-default-500">{formatEventTime(row.created_at)}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-default-400">
                    #{row.id.slice(0, 8)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </DashboardPageTemplate>
  );
}
