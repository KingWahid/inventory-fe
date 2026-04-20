"use client";

import { StockLiveIndicator } from "@/components/dashboard/StockLiveIndicator";
import {
  getDashboardMovementsChart,
  getDashboardSummary,
  type DashboardChartPeriod,
} from "@/lib/api/dashboard";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { queryKeys } from "@/lib/query-keys";
import { Alert } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

const STALE_MS = 30_000;

const PERIOD_OPTIONS: { value: DashboardChartPeriod; label: string }[] = [
  { value: "daily", label: "Harian (30 hari)" },
  { value: "weekly", label: "Mingguan (12 minggu)" },
  { value: "monthly", label: "Bulanan (12 bulan)" },
];

function formatNum(n: number): string {
  return n.toLocaleString("id-ID");
}

function shortBucketLabel(isoDate: string, period: DashboardChartPeriod): string {
  try {
    const d = new Date(isoDate + (isoDate.includes("T") ? "" : "T00:00:00Z"));
    if (Number.isNaN(d.getTime())) return isoDate.slice(0, 10);
    if (period === "monthly") {
      return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
    }
    if (period === "weekly") {
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    }
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return isoDate.slice(0, 10);
  }
}

function SummaryCard({
  title,
  subtitle,
  value,
  loading,
}: {
  title: string;
  subtitle?: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-lg border border-default-200 bg-background p-4 shadow-sm dark:border-default-100">
      <div className="text-xs font-medium uppercase tracking-wide text-default-500">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-0.5 text-xs text-default-500">{subtitle}</div>
      ) : null}
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {loading ? (
          <span className="inline-block h-8 w-16 animate-pulse rounded bg-default-200 dark:bg-default-800" />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardChartPeriod>("daily");

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
    <main className="flex min-h-full flex-1 flex-col gap-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ringkasan</h1>
          <p className="mt-1 text-sm text-default-600">
            Data cache server ~30 detik.
          </p>
        </div>
        <StockLiveIndicator />
      </div>

      {chartError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Gagal memuat dashboard</Alert.Title>
            <Alert.Description>
              {userFacingApiMessage(chartError)}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <section>
        <h2 className="sr-only">Kartu ringkasan</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Produk"
            subtitle="Non-deleted di tenant"
            value={summary ? formatNum(summary.total_products) : "—"}
            loading={summaryQuery.isLoading}
          />
          <SummaryCard
            title="Movement"
            subtitle="Terkonfirmasi hari ini (UTC)"
            value={summary ? formatNum(summary.movements_today) : "—"}
            loading={summaryQuery.isLoading}
          />
          <SummaryCard
            title="Low stock"
            subtitle="Di bawah reorder level"
            value={summary ? formatNum(summary.low_stock_count) : "—"}
            loading={summaryQuery.isLoading}
          />
          <SummaryCard
            title="Gudang aktif"
            subtitle="Mengganti slot Alerts sampai notifikasi"
            value={summary ? formatNum(summary.total_warehouses) : "—"}
            loading={summaryQuery.isLoading}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Movement terkonfirmasi</h2>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-default-600">Periode</span>
            <select
              className="rounded-md border border-default-300 bg-background px-2 py-1.5 text-sm"
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value as DashboardChartPeriod)
              }
            >
              {PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
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
                        {shortBucketLabel(p.bucket_start, chart.period)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-default-500">
              Belum ada data chart untuk periode ini.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
