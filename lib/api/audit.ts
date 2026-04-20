import { apiClient } from "./client";
import type { PaginationMeta } from "./categories";
import type { ApiEnvelopeSuccess } from "./types";

export type AuditLog = {
  id: string;
  tenant_id: string;
  user_id?: string | null;
  action: string;
  entity: string;
  entity_id: string;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  request_id?: string | null;
  created_at: string;
};

export type AuditLogListParams = {
  page?: number;
  per_page?: number;
  entity?: string;
  entity_id?: string;
  action?: string;
  user_id?: string;
  created_from?: string;
  created_to?: string;
};

type AuditLogListEnvelope = ApiEnvelopeSuccess<AuditLog[]> & {
  meta?: {
    request_id?: string;
    pagination?: PaginationMeta;
  };
};

export async function listAuditLogs(params: AuditLogListParams): Promise<{
  data: AuditLog[];
  pagination?: PaginationMeta;
}> {
  const res = await apiClient.get<AuditLogListEnvelope>(
    "/api/v1/inventory/audit-logs",
    { params },
  );
  return { data: res.data.data, pagination: res.data.meta?.pagination };
}
