import { apiClient } from "./client";
import type { PaginationMeta } from "./categories";
import type { ApiEnvelopeSuccess } from "./types";

export type Warehouse = {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type WarehouseListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
};

export type WarehouseCreateBody = {
  code: string;
  name: string;
  address?: string;
  is_active?: boolean;
};

export type WarehouseUpdateBody = Partial<WarehouseCreateBody>;

type WarehouseListEnvelope = ApiEnvelopeSuccess<Warehouse[]> & {
  meta?: {
    request_id?: string;
    pagination?: PaginationMeta;
  };
};

export async function listWarehouses(params: WarehouseListParams): Promise<{
  data: Warehouse[];
  pagination?: PaginationMeta;
}> {
  const res = await apiClient.get<WarehouseListEnvelope>(
    "/api/v1/inventory/warehouses",
    { params },
  );
  return { data: res.data.data, pagination: res.data.meta?.pagination };
}

export async function getWarehouse(warehouseId: string): Promise<Warehouse> {
  const res = await apiClient.get<ApiEnvelopeSuccess<Warehouse>>(
    `/api/v1/inventory/warehouses/${warehouseId}`,
  );
  return res.data.data;
}

export async function createWarehouse(
  body: WarehouseCreateBody,
): Promise<Warehouse> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Warehouse>>(
    "/api/v1/inventory/warehouses",
    body,
  );
  return res.data.data;
}

export async function updateWarehouse(
  warehouseId: string,
  body: WarehouseUpdateBody,
): Promise<Warehouse> {
  const res = await apiClient.put<ApiEnvelopeSuccess<Warehouse>>(
    `/api/v1/inventory/warehouses/${warehouseId}`,
    body,
  );
  return res.data.data;
}

export async function deleteWarehouse(warehouseId: string): Promise<void> {
  await apiClient.delete(`/api/v1/inventory/warehouses/${warehouseId}`);
}
