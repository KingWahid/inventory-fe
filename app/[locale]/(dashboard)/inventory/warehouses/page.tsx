"use client";

import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/ui/molecules/DataTable";
import { InventorySearchField } from "@/components/ui/molecules/InventorySearchField";
import { WarehouseFormModal } from "@/components/ui/organisms/warehouse/WarehouseFormModal";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  type Warehouse,
  type WarehouseCreateBody,
  type WarehouseListParams,
  type WarehouseUpdateBody,
  updateWarehouse,
} from "@/lib/api/warehouses";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type ModalState =
  | { open: false }
  | { open: true; mode: "create"; warehouse: null }
  | { open: true; mode: "edit"; warehouse: Warehouse };

const DEFAULT_PER_PAGE = 10;

function parsePositiveInt(v: string | null, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

function truncateAddress(s: string, max = 48): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function InventoryWarehousesPage() {
  const t = useTranslations("inventory.warehouses");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const SORT_FIELDS = useMemo(
    () =>
      [
        { value: "name" as const, label: t("sortName") },
        { value: "code" as const, label: t("sortCode") },
        { value: "created_at" as const, label: t("sortCreated") },
        { value: "updated_at" as const, label: t("sortUpdated") },
        { value: "is_active" as const, label: t("sortActive") },
      ] as const,
    [t],
  );

  const [searchDraft, setSearchDraft] = useState(
    searchParams.get("search") ?? "",
  );
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const per_page = parsePositiveInt(
    searchParams.get("per_page"),
    DEFAULT_PER_PAGE,
  );
  const search = (searchParams.get("search") ?? "").trim();
  const sortRaw = (searchParams.get("sort") ?? "name").trim();
  const sort = SORT_FIELDS.some((s) => s.value === sortRaw) ? sortRaw : "name";
  const order = (searchParams.get("order") === "desc" ? "desc" : "asc") as
    | "asc"
    | "desc";

  const listParams: WarehouseListParams = useMemo(
    () => ({
      page,
      per_page,
      search: search || undefined,
      sort,
      order,
    }),
    [page, per_page, search, sort, order],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.inventory.warehouses.list(listParams),
    queryFn: () => listWarehouses(listParams),
  });

  const rows = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination;
  const currentPage = pagination?.page ?? page;
  const totalPages = Math.max(1, pagination?.total_pages ?? 1);
  const tableColumns: DataTableColumn<Warehouse>[] = useMemo(
    () => [
      { key: "code", header: t("tableCode"), sortKey: "code", cellClassName: "font-medium", render: (item) => item.code },
      { key: "name", header: t("tableName"), sortKey: "name", render: (item) => item.name },
      {
        key: "active",
        header: t("tableActive"),
        sortKey: "is_active",
        render: (item) => (
          <span className={item.is_active ? "text-success-700 dark:text-success-400" : "text-default-500"}>
            {item.is_active ? tc("yes") : tc("no")}
          </span>
        ),
      },
      {
        key: "address",
        header: t("tableAddress"),
        sortKey: "address",
        cellClassName: "max-w-[280px] text-default-600",
        render: (item) => (item.address ? truncateAddress(item.address) : "—"),
      },
      {
        key: "actions",
        header: t("tableActions"),
        headerClassName: "text-right",
        cellClassName: "text-right",
        render: (item) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setModalState({ open: true, mode: "edit", warehouse: item })}
              >
                {tc("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(item)}>
                {tc("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [t, tc],
  );

  function setQueryParams(next: Partial<WarehouseListParams>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged: WarehouseListParams = {
      page,
      per_page,
      search: search || undefined,
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

    router.replace(`${pathname}?${params.toString()}`);
  }

  const createMut = useMutation({
    mutationFn: (payload: WarehouseCreateBody) => createWarehouse(payload),
    onSuccess: () => {
      setModalState({ open: false });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.warehouses.all(),
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: WarehouseUpdateBody;
    }) => updateWarehouse(id, payload),
    onSuccess: () => {
      setModalState({ open: false });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.warehouses.all(),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteWarehouse(id),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.warehouses.all(),
      });
    },
  });

  const mutationError =
    createMut.error ?? updateMut.error ?? deleteMut.error;
  const mutationBusy = createMut.isPending || updateMut.isPending;

  return (
    <DashboardPageTemplate gap="gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button
          variant="primary"
          onPress={() =>
            setModalState({ open: true, mode: "create", warehouse: null })
          }
        >
          {tc("adding")}
        </Button>
      </div>

      {mutationError ? (
        <ApiErrorAlert title={tc("operationFailed")}>
          {userFacingApiMessage(mutationError)}
        </ApiErrorAlert>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQueryParams({ page: 1, search: searchDraft.trim() || undefined });
        }}
      >
        <InventorySearchField
          label={tc("search")}
          className="min-w-[200px] flex-1"
          fullWidth
          placeholder={t("searchPlaceholder")}
          value={searchDraft}
          onChange={setSearchDraft}
        />
        <Button type="submit" variant="secondary" className="shrink-0">
          {tc("search")}
        </Button>
      </form>

      <DataTable
        columns={tableColumns}
        rows={rows}
        rowKey={(item) => item.id}
        sortState={{ key: sort, direction: order }}
        onSortChange={({ key, direction }) =>
          setQueryParams({ page: 1, sort: key, order: direction as "asc" | "desc" })
        }
        loading={listQuery.isLoading}
        loadingText={t("loading")}
        emptyText={tc("noData")}
        minWidthClassName="min-w-[840px]"
      />

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setQueryParams({ page: Math.max(1, currentPage - 1) })}
          disabled={currentPage <= 1}
        >
          {tc("prev")}
        </Button>
        <div className="text-sm text-default-600">
          {tc("pageOf", { page: currentPage, total: totalPages })}
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            setQueryParams({ page: Math.min(totalPages, currentPage + 1) })
          }
          disabled={currentPage >= totalPages}
        >
          {tc("next")}
        </Button>
      </div>

      <WarehouseFormModal
        open={modalState.open}
        mode={modalState.open ? modalState.mode : "create"}
        warehouse={modalState.open ? modalState.warehouse : null}
        busy={mutationBusy}
        onClose={() => setModalState({ open: false })}
        onSubmit={(payload) => {
          if (!modalState.open || modalState.mode === "create") {
            createMut.mutate(payload as WarehouseCreateBody);
            return;
          }
          updateMut.mutate({
            id: modalState.warehouse.id,
            payload: payload as WarehouseUpdateBody,
          });
        }}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-default-200 bg-background p-5 shadow-xl dark:border-default-100">
            <h3 className="text-lg font-semibold">{t("deleteTitle")}</h3>
            <p className="mt-2 text-sm text-default-600">
              {t("deleteConfirm", {
                name: deleteTarget.name,
                code: deleteTarget.code,
              })}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onPress={() => setDeleteTarget(null)}
                isDisabled={deleteMut.isPending}
              >
                {tc("cancel")}
              </Button>
              <Button
                variant="primary"
                onPress={() => deleteMut.mutate(deleteTarget.id)}
                isDisabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? tc("deleting") : tc("delete")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardPageTemplate>
  );
}
