import { apiClient } from "./client";
import type { ApiEnvelopeSuccess } from "./types";

export type PaginationMeta = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type Category = {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  parent_id?: string | null;
  sort_order?: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type CategoryListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  sort?: string;
  order?: "asc" | "desc";
};

export type CategoryCreateBody = {
  name: string;
  description?: string;
  parent_id?: string | null;
  sort_order?: number;
};

export type CategoryUpdateBody = Partial<CategoryCreateBody>;

type CategoryListEnvelope = ApiEnvelopeSuccess<Category[]> & {
  meta?: {
    request_id?: string;
    pagination?: PaginationMeta;
  };
};

export async function listCategories(params: CategoryListParams): Promise<{
  data: Category[];
  pagination?: PaginationMeta;
}> {
  const res = await apiClient.get<CategoryListEnvelope>(
    "/api/v1/inventory/categories",
    { params },
  );
  return { data: res.data.data, pagination: res.data.meta?.pagination };
}

export async function createCategory(body: CategoryCreateBody): Promise<Category> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Category>>(
    "/api/v1/inventory/categories",
    body,
  );
  return res.data.data;
}

export async function updateCategory(
  categoryId: string,
  body: CategoryUpdateBody,
): Promise<Category> {
  const res = await apiClient.put<ApiEnvelopeSuccess<Category>>(
    `/api/v1/inventory/categories/${categoryId}`,
    body,
  );
  return res.data.data;
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await apiClient.delete(`/api/v1/inventory/categories/${categoryId}`);
}
