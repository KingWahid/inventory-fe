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
import { buildActivitySseUrl } from "@/lib/api/sse-activity-url";
import { listAuditLogs, type AuditLog } from "@/lib/api/audit";
import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { SummaryStatCard } from "@/components/ui/organisms/SummaryStatCard";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import {
  getDashboardMovementsChart,
  getDashboardSummary,
  type DashboardChartPeriod,
} from "@/lib/api/dashboard";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { queryKeys } from "@/lib/query-keys";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  FiAlertTriangle,
  FiCheck,
  FiHome,
  FiPackage,
  FiPlus,
  FiRepeat,
} from "react-icons/fi";
import { useAuthStore } from "@/stores/auth";

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
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

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
  const auditActivityQuery = useQuery({
    queryKey: queryKeys.inventory.dashboard.auditActivity(),
    queryFn: async () => {
      const { data } = await listAuditLogs({ page: 1, per_page: 5 });
      return data;
    },
    staleTime: STALE_MS,
  });
  const warehouseActivityQuery = useQuery({
    queryKey: queryKeys.inventory.dashboard.warehouseActivity(),
    queryFn: async () => {
      const { data } = await listAuditLogs({ page: 1, per_page: 20 });
      return data
        .filter((row) => row.entity === "warehouse" || row.entity === "movement")
        .slice(0, 5);
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

  const chartError =
    summaryQuery.error ??
    chartQuery.error ??
    warehouseActivityQuery.error ??
    auditActivityQuery.error;
  const chartLoading = chartQuery.isLoading;
  useEffect(() => {
    if (!accessToken?.trim()) return;
    const es = new EventSource(buildActivitySseUrl(accessToken));
    const onActivityChanged = () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.dashboard.warehouseActivity(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.dashboard.auditActivity(),
      });
    };
    es.addEventListener("activity_changed", onActivityChanged);
    return () => {
      es.removeEventListener("activity_changed", onActivityChanged);
      es.close();
    };
  }, [accessToken, queryClient]);

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

  function activityIcon(row: AuditLog) {
    if (row.action.toUpperCase().includes("DELETE")) return <FiAlertTriangle className="size-3.5" />;
    if (row.action.toUpperCase().includes("CONFIRM")) return <FiCheck className="size-3.5" />;
    if (row.action.toUpperCase().includes("CREATE")) return <FiPlus className="size-3.5" />;
    return <FiRepeat className="size-3.5" />;
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

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-default-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#02395b]">
            {t("warehouseActivityTitle")}
          </h3>
          <div className="mt-4 min-h-44 space-y-4">
            {warehouseActivityQuery.isLoading ? (
              <p className="text-sm text-default-500">{t("activityLoading")}</p>
            ) : (warehouseActivityQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-default-500">{t("activityEmpty")}</p>
            ) : (
              warehouseActivityQuery.data?.map((row) => (
                <div key={row.id} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#d9efff] text-xs text-[#0a5a8c]">
                    {activityIcon(row)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">{row.entity}</p>
                    <p className="text-sm text-default-600">{row.action.toLowerCase()}</p>
                    <p className="text-xs text-default-500">{formatEventTime(row.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-default-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-[#02395b]">
            {t("auditActivityTitle")}
          </h3>
          <div className="mt-4 min-h-44 space-y-4">
            {auditActivityQuery.isLoading ? (
              <p className="text-sm text-default-500">{t("activityLoading")}</p>
            ) : (auditActivityQuery.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-default-500">{t("activityEmpty")}</p>
            ) : (
              auditActivityQuery.data?.map((row) => (
                <div key={row.id} className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-[#d9efff] text-xs text-[#0a5a8c]">
                    {activityIcon(row)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">
                      {row.entity}
                    </p>
                    <p className="text-sm text-default-600">
                      {row.action.toLowerCase()}
                    </p>
                    <p className="text-xs text-default-500">{formatEventTime(row.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </DashboardPageTemplate>
  );
}
