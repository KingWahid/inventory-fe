"use client";

import { listWarehouses } from "@/lib/api/warehouses";
import {
  listMovements,
  type Movement,
  type MovementListParams,
  type MovementStatus,
  type MovementType,
} from "@/lib/api/movements";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const DEFAULT_PER_PAGE = 20;

const TYPE_OPTIONS: { value: MovementType | ""; label: string }[] = [
  { value: "", label: "Semua jenis" },
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "transfer", label: "Transfer" },
  { value: "adjustment", label: "Adjustment" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Semua status" },
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const SORT_FIELDS = [
  { value: "created_at", label: "Dibuat" },
  { value: "updated_at", label: "Diubah" },
  { value: "reference_number", label: "Ref" },
  { value: "status", label: "Status" },
  { value: "type", label: "Tipe" },
] as const;

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

function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function InventoryMovementsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    <main className="flex min-h-full flex-1 flex-col gap-4 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Movements</h1>
        <Button
          variant="primary"
          onPress={() => router.push("/inventory/movements/new")}
        >
          + Buat movement
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
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-default-600">Jenis</label>
          <select
            className="min-w-[140px] rounded-md border border-default-300 bg-background px-3 py-2 text-sm"
            value={typeParam}
            onChange={(e) => {
              const v = e.target.value;
              setQueryParams({
                page: 1,
                ...(v === ""
                  ? { type: undefined }
                  : { type: v as MovementType }),
              });
            }}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.label + o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-default-600">Status</label>
          <select
            className="min-w-[140px] rounded-md border border-default-300 bg-background px-3 py-2 text-sm"
            value={statusParam}
            onChange={(e) => {
              const v = e.target.value;
              setQueryParams({
                page: 1,
                ...(v === ""
                  ? { status: undefined }
                  : { status: v as MovementStatus }),
              });
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.label + o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-default-600">Search</label>
          <input
            className="w-full rounded-md border border-default-300 bg-background px-3 py-2 text-sm"
            placeholder="Nomor referensi…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-default-600">Urut</label>
          <div className="flex flex-wrap gap-1">
            <select
              className="rounded-md border border-default-300 bg-background px-2 py-2 text-sm"
              value={sort}
              onChange={(e) =>
                setQueryParams({ page: 1, sort: e.target.value })
              }
            >
              {SORT_FIELDS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border border-default-300 bg-background px-2 py-2 text-sm"
              value={order}
              onChange={(e) =>
                setQueryParams({
                  page: 1,
                  order: e.target.value === "asc" ? "asc" : "desc",
                })
              }
            >
              <option value="desc">Turun</option>
              <option value="asc">Naik</option>
            </select>
          </div>
        </div>
        <Button type="submit" variant="secondary" className="shrink-0">
          Cari
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-default-200">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-default-100/60 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">Ref</th>
              <th className="px-3 py-2 font-semibold">Tipe</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">Gudang</th>
              <th className="px-3 py-2 font-semibold">Updated</th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td className="px-3 py-6 text-default-500" colSpan={5}>
                  Memuat movements…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-default-500" colSpan={5}>
                  Belum ada data.
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
                    {formatUpdated(item.updated_at)}
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
          {"< Prev"}
        </Button>
        <div className="text-sm text-default-600">
          hal {page} / {totalPages}
        </div>
        <Button
          variant="secondary"
          onPress={() =>
            setQueryParams({ page: Math.min(totalPages, page + 1) })
          }
          isDisabled={page >= totalPages}
        >
          {"Next >"}
        </Button>
      </div>
    </main>
  );
}
