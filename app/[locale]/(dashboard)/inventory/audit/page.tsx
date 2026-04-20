"use client";

import {
  listAuditLogs,
  type AuditLog,
  type AuditLogListParams,
} from "@/lib/api/audit";
import { Button } from "@/components/ui/button";
import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { InventorySelect } from "@/components/ui/molecules/InventorySelect";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import { usePathname, useRouter } from "@/i18n/navigation";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { queryKeys } from "@/lib/query-keys";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_PER_PAGE = 20;

function parsePositiveInt(v: string | null, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function formatWhen(iso: string, locale: string): string {
  const tag = locale === "en" ? "en-US" : "id-ID";
  try {
    return new Date(iso).toLocaleString(tag, {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

function shortUuid(id: string | null | undefined): string {
  if (!id?.trim()) return "—";
  const t = id.trim();
  if (t.length <= 13) return t;
  return `${t.slice(0, 8)}…`;
}

/** datetime-local value from ISO string (best-effort local) */
function isoToDatetimeLocal(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = d.getFullYear();
    const mo = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const h = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${y}-${mo}-${day}T${h}:${mi}`;
  } catch {
    return "";
  }
}

export default function InventoryAuditPage() {
  const t = useTranslations("inventory.audit");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const ENTITY_FILTER_ITEMS = useMemo(
    () => [
      { id: "", label: t("entityAll") },
      { id: "category", label: t("entityCategory") },
      { id: "product", label: t("entityProduct") },
      { id: "warehouse", label: t("entityWarehouse") },
      { id: "movement", label: t("entityMovement") },
    ],
    [t],
  );

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const per_page = parsePositiveInt(
    searchParams.get("per_page"),
    DEFAULT_PER_PAGE,
  );
  const entity = (searchParams.get("entity") ?? "").trim();
  const action = (searchParams.get("action") ?? "").trim();
  const entity_id = (searchParams.get("entity_id") ?? "").trim();
  const user_id = (searchParams.get("user_id") ?? "").trim();
  const created_from = (searchParams.get("created_from") ?? "").trim();
  const created_to = (searchParams.get("created_to") ?? "").trim();

  const [actionDraft, setActionDraft] = useState(action);
  const [entityIdDraft, setEntityIdDraft] = useState(entity_id);
  const [userIdDraft, setUserIdDraft] = useState(user_id);
  const [createdFromDraft, setCreatedFromDraft] = useState(
    created_from ? isoToDatetimeLocal(created_from) : "",
  );
  const [createdToDraft, setCreatedToDraft] = useState(
    created_to ? isoToDatetimeLocal(created_to) : "",
  );
  const [showAdvanced, setShowAdvanced] = useState(
    Boolean(entity_id || user_id || created_from || created_to),
  );

  /* eslint-disable react-hooks/set-state-in-effect -- keep filter drafts in sync with URL */
  useEffect(() => {
    setActionDraft(action);
    setEntityIdDraft(entity_id);
    setUserIdDraft(user_id);
    setCreatedFromDraft(
      created_from ? isoToDatetimeLocal(created_from) : "",
    );
    setCreatedToDraft(created_to ? isoToDatetimeLocal(created_to) : "");
  }, [action, entity_id, user_id, created_from, created_to]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const listParams: AuditLogListParams = useMemo(() => {
    const p: AuditLogListParams = {
      page,
      per_page,
    };
    if (entity) p.entity = entity;
    if (action) p.action = action;
    if (entity_id) p.entity_id = entity_id;
    if (user_id) p.user_id = user_id;
    if (created_from) p.created_from = created_from;
    if (created_to) p.created_to = created_to;
    return p;
  }, [
    page,
    per_page,
    entity,
    action,
    entity_id,
    user_id,
    created_from,
    created_to,
  ]);

  const listQuery = useQuery({
    queryKey: queryKeys.inventory.audit.list(listParams),
    queryFn: () => listAuditLogs(listParams),
  });

  const rows = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  function setQueryParams(next: Partial<AuditLogListParams & { page?: number }>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = {
      page,
      per_page,
      entity: entity || undefined,
      action: action || undefined,
      entity_id: entity_id || undefined,
      user_id: user_id || undefined,
      created_from: created_from || undefined,
      created_to: created_to || undefined,
      ...next,
    };

    const assign = (k: string, v: string | number | undefined) => {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, String(v));
    };

    assign("page", merged.page);
    assign("per_page", merged.per_page);
    assign("entity", merged.entity);
    assign("action", merged.action);
    assign("entity_id", merged.entity_id);
    assign("user_id", merged.user_id);
    assign("created_from", merged.created_from);
    assign("created_to", merged.created_to);

    router.replace(`${pathname}?${params.toString()}`);
  }

  function applyFilters() {
    let fromIso: string | undefined;
    let toIso: string | undefined;
    if (createdFromDraft.trim()) {
      const d = new Date(createdFromDraft);
      if (!Number.isNaN(d.getTime())) fromIso = d.toISOString();
    }
    if (createdToDraft.trim()) {
      const d = new Date(createdToDraft);
      if (!Number.isNaN(d.getTime())) toIso = d.toISOString();
    }
    setQueryParams({
      page: 1,
      action: actionDraft.trim() || undefined,
      entity_id: entityIdDraft.trim() || undefined,
      user_id: userIdDraft.trim() || undefined,
      created_from: fromIso,
      created_to: toIso,
    });
  }

  const err = listQuery.error;

  return (
    <DashboardPageTemplate gap="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters();
        }}
      >
        <div className="flex flex-wrap items-end gap-3">
          <InventorySelect
            label={t("entity")}
            className="min-w-[160px]"
            items={ENTITY_FILTER_ITEMS}
            value={entity}
            onChange={(v) =>
              setQueryParams({
                page: 1,
                entity: v.trim() || undefined,
              })
            }
          />
          <div className="flex min-w-[140px] flex-col gap-1">
            <label className="text-xs font-medium text-default-600">{t("action")}</label>
            <input
              className="rounded-md border border-default-300 bg-background px-3 py-2 text-sm"
              placeholder={t("actionPlaceholder")}
              value={actionDraft}
              onChange={(e) => setActionDraft(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" className="shrink-0">
            {t("apply")}
          </Button>
          <button
            type="button"
            className="text-sm text-primary underline-offset-2 hover:underline"
            onClick={() => setShowAdvanced((s) => !s)}
          >
            {showAdvanced ? t("advancedHide") : t("advancedShow")}
          </button>
        </div>

        {showAdvanced ? (
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-default-200 bg-default-50/50 p-3 dark:bg-default-50/5">
            <div className="flex min-w-[260px] flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-default-600">
                {t("entityId")}
              </label>
              <input
                className="w-full rounded-md border border-default-300 bg-background px-3 py-2 font-mono text-sm"
                placeholder={tc("uuidPlaceholder")}
                value={entityIdDraft}
                onChange={(e) => setEntityIdDraft(e.target.value)}
              />
            </div>
            <div className="flex min-w-[260px] flex-1 flex-col gap-1">
              <label className="text-xs font-medium text-default-600">
                {t("userId")}
              </label>
              <input
                className="w-full rounded-md border border-default-300 bg-background px-3 py-2 font-mono text-sm"
                placeholder={tc("uuidPlaceholder")}
                value={userIdDraft}
                onChange={(e) => setUserIdDraft(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-default-600">
                {t("fromTime")}
              </label>
              <input
                type="datetime-local"
                className="rounded-md border border-default-300 bg-background px-3 py-2 text-sm"
                value={createdFromDraft}
                onChange={(e) => setCreatedFromDraft(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-default-600">
                {t("toTime")}
              </label>
              <input
                type="datetime-local"
                className="rounded-md border border-default-300 bg-background px-3 py-2 text-sm"
                value={createdToDraft}
                onChange={(e) => setCreatedToDraft(e.target.value)}
              />
            </div>
          </div>
        ) : null}
      </form>

      {err ? (
        <ApiErrorAlert title={t("loadFail")}>
          {userFacingApiMessage(err)}
        </ApiErrorAlert>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-default-200">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-default-100/60 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">{t("tableTime")}</th>
              <th className="px-3 py-2 font-semibold">{t("tableAction")}</th>
              <th className="px-3 py-2 font-semibold">{t("tableEntity")}</th>
              <th className="px-3 py-2 font-semibold">{t("tableId")}</th>
              <th className="px-3 py-2 font-semibold">{t("tableUser")}</th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td className="px-3 py-6 text-default-500" colSpan={5}>
                  {t("loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-default-500" colSpan={5}>
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((item: AuditLog) => (
                <tr key={item.id} className="border-t border-default-200">
                  <td className="px-3 py-2 tabular-nums text-default-700">
                    {formatWhen(item.created_at, locale)}
                  </td>
                  <td className="px-3 py-2">{item.action}</td>
                  <td className="px-3 py-2">{item.entity}</td>
                  <td className="px-3 py-2 font-mono text-xs text-default-800">
                    <span title={item.entity_id}>{shortUuid(item.entity_id)}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-default-700">
                    {item.user_id ? (
                      <span title={item.user_id}>{shortUuid(item.user_id)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onPress={() => setQueryParams({ page: Math.max(1, page - 1) })}
          isDisabled={page <= 1}
        >
          {tc("prev")}
        </Button>
        <div className="text-sm text-default-600">
          {tc("pageOf", { page, total: totalPages })}
        </div>
        <Button
          variant="secondary"
          onPress={() =>
            setQueryParams({ page: Math.min(totalPages, page + 1) })
          }
          isDisabled={page >= totalPages}
        >
          {tc("next")}
        </Button>
      </div>
    </DashboardPageTemplate>
  );
}
