import { apiClient } from "./client";
import type { ApiEnvelopeSuccess } from "./types";

export type DashboardChartPeriod = "daily" | "weekly" | "monthly";

export type DashboardSummary = {
  total_products: number;
  total_warehouses: number;
  movements_today: number;
  low_stock_count: number;
};

export type DashboardMovementChartPoint = {
  bucket_start: string;
  movement_count: number;
};

export type DashboardMovementChart = {
  period: DashboardChartPeriod;
  points: DashboardMovementChartPoint[];
};

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const res = await apiClient.get<ApiEnvelopeSuccess<DashboardSummary>>(
    "/api/v1/inventory/dashboard/summary",
  );
  return res.data.data;
}

export async function getDashboardMovementsChart(
  period: DashboardChartPeriod = "daily",
): Promise<DashboardMovementChart> {
  const res = await apiClient.get<ApiEnvelopeSuccess<DashboardMovementChart>>(
    "/api/v1/inventory/dashboard/movements/chart",
    { params: { period } },
  );
  return res.data.data;
}
