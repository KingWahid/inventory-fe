"use client";

import { InventorySearchField } from "@/components/ui/molecules/InventorySearchField";
import { InventorySelect } from "@/components/ui/molecules/InventorySelect";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  listMovements,
  type Movement,
  type MovementListParams,
  type MovementStatus,
  type MovementType,
} from "@/lib/api/movements";
import { listWarehouses } from "@/lib/api/warehouses";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

const DEFAULT_PER_PAGE = 20;

function parsePositiveInt(v: string | null, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function warehouseColumnLabel(
  m: Movement,
  codeById: Map<string, string>,
): string {
  const srcId = m.source_warehouse_id?.trim();
  const dstId = m.destination_warehouse_id?.trim();
  const src = srcId ? codeById.get(srcId) ?? srcId.slice(0, 8) + "…" : null;
  const dst = dstId ? codeById.get(dstId) ?? dstId.slice(0, 8) + "…" : null;
  switch (m.type) {
    case "inbound":
      return dst ?? "—";
    case "outbound":
      return src ?? "—";
    case "transfer":
      if (src && dst) return `${src} → ${dst}`;
      return src ?? dst ?? "—";
    case "adjustment":
      if (src && dst) return `${src} → ${dst}`;
      if (src) return `− ${src}`;
      if (dst) return `+ ${dst}`;
      return "—";
    default:
      return "—";
  }
}

function formatUpdated(iso: string, locale: string): string {
  const tag = locale === "en" ? "en-US" : "id-ID";
  try {
    return new Date(iso).toLocaleString(tag, {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function InventoryMovementsPage() {
  const t = useTranslations("inventory.movements");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const SORT_FIELDS = useMemo(
    () =>
      [
        { value: "created_at" as const, label: t("sortCreated") },
        { value: "updated_at" as const, label: t("sortUpdated") },
        { value: "reference_number" as const, label: t("sortRef") },
        { value: "status" as const, label: t("sortStatus") },
        { value: "type" as const, label: t("sortType") },
      ] as const,
    [t],
  );

  const TYPE_OPTIONS = useMemo(
    () =>
      [
        { value: "" as const, label: t("typeAll") },
        { value: "inbound" as const, label: t("typeInbound") },
        { value: "outbound" as const, label: t("typeOutbound") },
        { value: "transfer" as const, label: t("typeTransfer") },
        { value: "adjustment" as const, label: t("typeAdjustment") },
      ] as const,
    [t],
  );

  const STATUS_OPTIONS = useMemo(
    () =>
      [
        { value: "" as const, label: t("statusAll") },
        { value: "draft" as const, label: t("statusDraft") },
        { value: "confirmed" as const, label: t("statusConfirmed") },
        { value: "cancelled" as const, label: t("statusCancelled") },
      ] as const,
    [t],
  );

  const typeFilterItems = useMemo(
    () => TYPE_OPTIONS.map((o) => ({ id: o.value, label: o.label })),
    [TYPE_OPTIONS],
  );

  const statusFilterItems = useMemo(
    () => STATUS_OPTIONS.map((o) => ({ id: o.value, label: o.label })),
    [STATUS_OPTIONS],
  );

  const sortFilterItems = useMemo(
    () => SORT_FIELDS.map((s) => ({ id: s.value, label: s.label })),
    [SORT_FIELDS],
  );

  const orderFilterItems = useMemo(
    () => [
      { id: "desc", label: tc("desc") },
      { id: "asc", label: tc("asc") },
    ],
    [tc],
  );

  const [searchDraft, setSearchDraft] = useState(
    searchParams.get("search") ?? "",
  );

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const per_page = parsePositiveInt(
    searchParams.get("per_page"),
    DEFAULT_PER_PAGE,
  );
  const search = (searchParams.get("search") ?? "").trim();
  const typeParam = (searchParams.get("type") ?? "").trim();
  const statusParam = (searchParams.get("status") ?? "").trim();

  const typeFilter =
    typeParam === "inbound" ||
    typeParam === "outbound" ||
    typeParam === "transfer" ||
    typeParam === "adjustment"
      ? typeParam
      : undefined;

  const statusFilter =
    statusParam === "draft" ||
    statusParam === "confirmed" ||
    statusParam === "cancelled"
      ? statusParam
      : undefined;

  const sortRaw = (searchParams.get("sort") ?? "created_at").trim();
  const sort = SORT_FIELDS.some((s) => s.value === sortRaw)
    ? sortRaw
    : "created_at";
  const order = (searchParams.get("order") === "asc" ? "asc" : "desc") as
    | "asc"
    | "desc";

  const listParams: MovementListParams = useMemo(
    () => ({
      page,
      per_page,
      search: search || undefined,
      type: typeFilter,
      status: statusFilter,
      sort,
      order,
    }),
    [page, per_page, search, typeFilter, statusFilter, sort, order],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.inventory.movements.list(listParams),
    queryFn: () => listMovements(listParams),
  });

  const warehousesQuery = useQuery({
    queryKey: queryKeys.inventory.warehouses.list({
      page: 1,
      per_page: 500,
      sort: "code",
      order: "asc",
    }),
    queryFn: () =>
      listWarehouses({ page: 1, per_page: 500, sort: "code", order: "asc" }),
  });

  const warehouseCodeById = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of warehousesQuery.data?.data ?? []) {
      m.set(w.id, w.code);
    }
    return m;
  }, [warehousesQuery.data?.data]);

  const rows = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  function setQueryParams(
    next: Partial<
      MovementListParams & { type?: MovementType; status?: MovementStatus }
    >,
  ) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = {
      page,
      per_page,
      search: search || undefined,
      type: typeFilter,
      status: statusFilter,
      sort,
      order,
      ...next,
    };

    const assign = (k: string, v: string | number | undefined) => {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, String(v));
    };

    assign("page", merged.page);
    assign("per_page", merged.per_page);
    assign("search", merged.search);
    assign("sort", merged.sort);
    assign("order", merged.order);
    assign("type", merged.type);
    assign("status", merged.status);

    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <DashboardPageTemplate gap="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button
          variant="primary"
          onPress={() => router.push("/inventory/movements/new")}
        >
          {t("create")}
        </Button>
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQueryParams({
            page: 1,
            search: searchDraft.trim() || undefined,
          });
        }}
      >
        <InventorySelect
          label={t("typeLabel")}
          className="min-w-[140px]"
          items={typeFilterItems}
          value={typeParam}
          onChange={(v) =>
            setQueryParams({
              page: 1,
              ...(v === ""
                ? { type: undefined }
                : { type: v as MovementType }),
            })
          }
        />
        <InventorySelect
          label={t("statusLabel")}
          className="min-w-[140px]"
          items={statusFilterItems}
          value={statusParam}
          onChange={(v) =>
            setQueryParams({
              page: 1,
              ...(v === ""
                ? { status: undefined }
                : { status: v as MovementStatus }),
            })
          }
        />
        <InventorySearchField
          label={t("searchLabel")}
          className="min-w-[200px] flex-1"
          fullWidth
          placeholder={t("searchPlaceholder")}
          value={searchDraft}
          onChange={setSearchDraft}
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-default-600">{tc("sort")}</span>
          <div className="flex flex-wrap gap-1">
            <InventorySelect
              className="min-w-[8rem]"
              items={sortFilterItems}
              value={sort}
              onChange={(id) =>
                setQueryParams({ page: 1, sort: id })
              }
              ariaLabel={tc("sortColumnAria")}
            />
            <InventorySelect
              className="min-w-[6rem]"
              items={orderFilterItems}
              value={order}
              onChange={(id) =>
                setQueryParams({
                  page: 1,
                  order: id === "asc" ? "asc" : "desc",
                })
              }
              ariaLabel={tc("sortDirAria")}
            />
          </div>
        </div>
        <Button type="submit" variant="secondary" className="shrink-0">
          {tc("search")}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-default-200">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-default-100/60 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">{t("tableRef")}</th>
              <th className="px-3 py-2 font-semibold">{t("tableType")}</th>
              <th className="px-3 py-2 font-semibold">{t("tableStatus")}</th>
              <th className="px-3 py-2 font-semibold">{t("tableWarehouse")}</th>
              <th className="px-3 py-2 font-semibold">{t("tableUpdated")}</th>
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
                  {tc("noData")}
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id} className="border-t border-default-200">
                  <td className="px-3 py-2 font-medium">
                    <Link
                      href={`/inventory/movements/${item.id}`}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {item.reference_number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{item.type}</td>
                  <td className="px-3 py-2">{item.status}</td>
                  <td className="px-3 py-2 text-default-700">
                    {warehouseColumnLabel(item, warehouseCodeById)}
                  </td>
                  <td className="px-3 py-2 text-default-600 tabular-nums">
                    {formatUpdated(item.updated_at, locale)}
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
