import { apiClient } from "./client";
import type { PaginationMeta } from "./categories";
import type { ApiEnvelopeSuccess } from "./types";

export type MovementType = "inbound" | "outbound" | "transfer" | "adjustment";

export type MovementStatus = "draft" | "confirmed" | "cancelled";

export type MovementLine = {
  id: string;
  movement_id: string;
  product_id: string;
  quantity: number;
  notes?: string | null;
  created_at: string;
};

export type Movement = {
  id: string;
  tenant_id: string;
  type: MovementType;
  reference_number: string;
  source_warehouse_id?: string | null;
  destination_warehouse_id?: string | null;
  created_by: string;
  status: MovementStatus;
  notes?: string | null;
  idempotency_key?: string | null;
  idempotency_request_hash?: string | null;
  lines?: MovementLine[];
  created_at: string;
  updated_at: string;
};

export type MovementListParams = {
  page?: number;
  per_page?: number;
  search?: string;
  type?: MovementType;
  status?: MovementStatus;
  sort?: string;
  order?: "asc" | "desc";
};

type MovementListEnvelope = ApiEnvelopeSuccess<Movement[]> & {
  meta?: {
    request_id?: string;
    pagination?: PaginationMeta;
  };
};

export async function listMovements(params: MovementListParams): Promise<{
  data: Movement[];
  pagination?: PaginationMeta;
}> {
  const res = await apiClient.get<MovementListEnvelope>(
    "/api/v1/inventory/movements",
    { params },
  );
  return { data: res.data.data, pagination: res.data.meta?.pagination };
}

export async function getMovement(movementId: string): Promise<Movement> {
  const res = await apiClient.get<ApiEnvelopeSuccess<Movement>>(
    `/api/v1/inventory/movements/${movementId}`,
  );
  return res.data.data;
}

export async function confirmMovement(movementId: string): Promise<Movement> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Movement>>(
    `/api/v1/inventory/movements/${movementId}/confirm`,
  );
  return res.data.data;
}

export async function cancelMovement(movementId: string): Promise<Movement> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Movement>>(
    `/api/v1/inventory/movements/${movementId}/cancel`,
  );
  return res.data.data;
}

/** Draft create payloads — JSON keys snake_case per OpenAPI / backend bind. */
export type MovementLineCreateBody = {
  product_id: string;
  quantity: number;
  notes?: string;
};

export type InboundCreateBody = {
  reference_number: string;
  destination_warehouse_id: string;
  lines: MovementLineCreateBody[];
  notes?: string;
};

export type OutboundCreateBody = {
  reference_number: string;
  source_warehouse_id: string;
  lines: MovementLineCreateBody[];
  notes?: string;
};

export type TransferCreateBody = {
  reference_number: string;
  source_warehouse_id: string;
  destination_warehouse_id: string;
  lines: MovementLineCreateBody[];
  notes?: string;
};

/** Exactly one warehouse field must be set (validated client + server). */
export type AdjustmentCreateBody = {
  reference_number: string;
  lines: MovementLineCreateBody[];
  notes?: string;
} & (
  | { source_warehouse_id: string; destination_warehouse_id?: undefined }
  | { destination_warehouse_id: string; source_warehouse_id?: undefined }
);

function idempotencyHeaders(key: string): { "Idempotency-Key": string } {
  return { "Idempotency-Key": key };
}

export async function createInboundDraft(
  body: InboundCreateBody,
  idempotencyKey: string,
): Promise<Movement> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Movement>>(
    "/api/v1/inventory/movements/inbound",
    body,
    { headers: idempotencyHeaders(idempotencyKey) },
  );
  return res.data.data;
}

export async function createOutboundDraft(
  body: OutboundCreateBody,
  idempotencyKey: string,
): Promise<Movement> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Movement>>(
    "/api/v1/inventory/movements/outbound",
    body,
    { headers: idempotencyHeaders(idempotencyKey) },
  );
  return res.data.data;
}

export async function createTransferDraft(
  body: TransferCreateBody,
  idempotencyKey: string,
): Promise<Movement> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Movement>>(
    "/api/v1/inventory/movements/transfer",
    body,
    { headers: idempotencyHeaders(idempotencyKey) },
  );
  return res.data.data;
}

export async function createAdjustmentDraft(
  body: AdjustmentCreateBody,
  idempotencyKey: string,
): Promise<Movement> {
  const res = await apiClient.post<ApiEnvelopeSuccess<Movement>>(
    "/api/v1/inventory/movements/adjustment",
    body,
    { headers: idempotencyHeaders(idempotencyKey) },
  );
  return res.data.data;
}
