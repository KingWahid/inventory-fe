import { apiClient } from "./client";
import type { PaginationMeta } from "./categories";
import type { ApiEnvelopeSuccess } from "./types";

export type Product = {
  id: string;
  tenant_id: string;
  category_id?: string | null;
  sku: string;
  name: string;
  description?: string;
  unit?: string;
  price?: number;
  reorder_level?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type ProductListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
  category_id?: string;
};

export type ProductCreateBody = {
  sku: string;
  name: string;
  category_id?: string | null;
  description?: string;
  unit?: string;
  price?: number;
  reorder_level?: number;
  metadata?: Record<string, unknown>;
};

export type ProductUpdateBody = Partial<ProductCreateBody>;

type ProductListEnvelope = ApiEnvelopeSuccess<Product[]> & {
  meta?: {
    request_id?: string;
    pagination?: PaginationMeta;
  };
};

export async function listProducts(params: ProductListParams): Promise<{
  data: Product[];
  pagination?: PaginationMeta;
}> {
  const res = await apiClient.get<ProductListEnvelope>(
    "/api/v1/inventory/products",
    { params },
  );
  return { data: res.data.data, pagination: res.data.meta?.pagination };
}

export async function getProduct(productId: string): Promise<Product> {
  const res = await apiClient.get<ApiEnvelopeSuccess<Product>>(
    `/api/v1/inventory/products/${productId}`,
  );
  return res.data.data;
}

export async function createProduct(body: ProductCreateBody): Promise<Product> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Product>>(
    "/api/v1/inventory/products",
    body,
  );
  return res.data.data;
}

export async function updateProduct(
  productId: string,
  body: ProductUpdateBody,
): Promise<Product> {
  const res = await apiClient.put<ApiEnvelopeSuccess<Product>>(
    `/api/v1/inventory/products/${productId}`,
    body,
  );
  return res.data.data;
}

export async function deleteProduct(productId: string): Promise<void> {
  await apiClient.delete(`/api/v1/inventory/products/${productId}`);
}

export async function restoreProduct(productId: string): Promise<Product> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Product>>(
    `/api/v1/inventory/products/${productId}/restore`,
  );
  return res.data.data;
}
