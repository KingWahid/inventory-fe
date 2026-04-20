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
import { InventorySelect } from "@/components/ui/molecules/InventorySelect";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import { ProductFormModal } from "@/components/ui/organisms/product/ProductFormModal";
import { listCategories } from "@/lib/api/categories";
import {
  createProduct,
  deleteProduct,
  listProducts,
  restoreProduct,
  type Product,
  type ProductCreateBody,
  type ProductListParams,
  type ProductUpdateBody,
  updateProduct,
} from "@/lib/api/products";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { formatIdr } from "@/lib/format/currency";
import { queryKeys } from "@/lib/query-keys";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type ModalState =
  | { open: false }
  | { open: true; mode: "create"; product: null }
  | { open: true; mode: "edit"; product: Product };

const DEFAULT_PER_PAGE = 20;

function parsePositiveInt(v: string | null, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export default function InventoryProductsPage() {
  const t = useTranslations("inventory.products");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const SORT_FIELDS = useMemo(
    () =>
      [
        { value: "name" as const, label: t("sortName") },
        { value: "sku" as const, label: t("sortSku") },
        { value: "price" as const, label: t("sortPrice") },
        { value: "created_at" as const, label: t("sortCreated") },
        { value: "updated_at" as const, label: t("sortUpdated") },
        { value: "reorder_level" as const, label: t("sortReorder") },
      ] as const,
    [t],
  );

  const [searchDraft, setSearchDraft] = useState(
    searchParams.get("search") ?? "",
  );
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreIdDraft, setRestoreIdDraft] = useState("");

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const per_page = parsePositiveInt(
    searchParams.get("per_page"),
    DEFAULT_PER_PAGE,
  );
  const search = (searchParams.get("search") ?? "").trim();
  const category_id = (searchParams.get("category_id") ?? "").trim();
  const sortRaw = (searchParams.get("sort") ?? "name").trim();
  const sort = SORT_FIELDS.some((s) => s.value === sortRaw) ? sortRaw : "name";
  const order = (searchParams.get("order") === "desc" ? "desc" : "asc") as
    | "asc"
    | "desc";

  const listParams: ProductListParams = useMemo(
    () => ({
      page,
      per_page,
      search: search || undefined,
      sort,
      order,
      category_id: category_id || undefined,
    }),
    [page, per_page, search, sort, order, category_id],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.inventory.products.list(listParams),
    queryFn: () => listProducts(listParams),
  });

  const categoriesQuery = useQuery({
    queryKey: queryKeys.inventory.categories.list({
      page: 1,
      per_page: 500,
      sort: "name",
      order: "asc",
    }),
    queryFn: () =>
      listCategories({ page: 1, per_page: 500, sort: "name", order: "asc" }),
  });

  const categoryRows = categoriesQuery.data?.data ?? [];
  const categoryData = categoriesQuery.data?.data;

  const categoryFilterItems = useMemo(
    () => [
      { id: "", label: tc("all") },
      ...(categoryData ?? []).map((c) => ({ id: c.id, label: c.name })),
    ],
    [categoryData, tc],
  );

  const sortFilterItems = useMemo(
    () => SORT_FIELDS.map((s) => ({ id: s.value, label: s.label })),
    [SORT_FIELDS],
  );

  const orderFilterItems = useMemo(
    () => [
      { id: "asc", label: tc("asc") },
      { id: "desc", label: tc("desc") },
    ],
    [tc],
  );

  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categoryData ?? []) {
      m.set(c.id, c.name);
    }
    return m;
  }, [categoryData]);

  const rows = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;
  const tableColumns: DataTableColumn<Product>[] = useMemo(
    () => [
      { key: "sku", header: t("tableSku"), sortKey: "sku", cellClassName: "font-medium", render: (item) => item.sku },
      { key: "name", header: t("tableName"), sortKey: "name", render: (item) => item.name },
      {
        key: "category",
        header: t("tableCategory"),
        sortKey: "category_id",
        cellClassName: "text-default-600",
        render: (item) => (item.category_id ? categoryNameById.get(item.category_id) ?? "—" : "—"),
      },
      {
        key: "price",
        header: t("tablePrice"),
        sortKey: "price",
        cellClassName: "tabular-nums",
        render: (item) =>
          typeof item.price === "number" && Number.isFinite(item.price)
            ? formatIdr(item.price)
            : formatIdr(0),
      },
      {
        key: "unit",
        header: t("tableUnit"),
        sortKey: "unit",
        cellClassName: "text-default-600",
        render: (item) => item.unit || "—",
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
                onClick={() => setModalState({ open: true, mode: "edit", product: item })}
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
    [t, tc, categoryNameById],
  );

  function setQueryParams(next: Partial<ProductListParams>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged: ProductListParams = {
      page,
      per_page,
      search: search || undefined,
      sort,
      order,
      category_id: category_id || undefined,
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
    assign("category_id", merged.category_id);

    router.replace(`${pathname}?${params.toString()}`);
  }

  const createMut = useMutation({
    mutationFn: (payload: ProductCreateBody) => createProduct(payload),
    onSuccess: () => {
      setModalState({ open: false });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.products.all(),
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductUpdateBody }) =>
      updateProduct(id, payload),
    onSuccess: () => {
      setModalState({ open: false });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.products.all(),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.products.all(),
      });
    },
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => restoreProduct(id.trim()),
    onSuccess: () => {
      setRestoreOpen(false);
      setRestoreIdDraft("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.products.all(),
      });
    },
  });

  const mutationError =
    createMut.error ??
    updateMut.error ??
    deleteMut.error ??
    restoreMut.error;
  const mutationBusy = createMut.isPending || updateMut.isPending;

  return (
    <DashboardPageTemplate gap="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onPress={() => setRestoreOpen(true)}>
            {tc("restore")}
          </Button>
          <Button
            variant="primary"
            onPress={() =>
              setModalState({ open: true, mode: "create", product: null })
            }
          >
            {tc("adding")}
          </Button>
        </div>
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
        <InventorySelect
          label={t("category")}
          className="min-w-[180px]"
          items={categoryFilterItems}
          value={category_id}
          onChange={(v) =>
            setQueryParams({
              page: 1,
              category_id: v.trim() || undefined,
            })
          }
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-default-600">{tc("sort")}</span>
          <div className="flex flex-wrap gap-1">
            <InventorySelect
              className="min-w-[8.5rem]"
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
                  order: id === "desc" ? "desc" : "asc",
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

      <ProductFormModal
        open={modalState.open}
        mode={modalState.open ? modalState.mode : "create"}
        product={modalState.open ? modalState.product : null}
        categories={categoryRows}
        busy={mutationBusy}
        onClose={() => setModalState({ open: false })}
        onSubmit={(payload) => {
          if (!modalState.open || modalState.mode === "create") {
            createMut.mutate(payload as ProductCreateBody);
            return;
          }
          updateMut.mutate({
            id: modalState.product.id,
            payload: payload as ProductUpdateBody,
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
                sku: deleteTarget.sku,
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

      {restoreOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-default-200 bg-background p-5 shadow-xl dark:border-default-100">
            <h3 className="text-lg font-semibold">{t("restoreTitle")}</h3>
            <p className="mt-2 text-sm text-default-600">{t("restoreHint")}</p>
            <input
              className="mt-3 w-full rounded-md border border-default-300 bg-background px-3 py-2 font-mono text-sm"
              placeholder={t("restorePlaceholder")}
              value={restoreIdDraft}
              onChange={(e) => setRestoreIdDraft(e.target.value)}
              disabled={restoreMut.isPending}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onPress={() => {
                  setRestoreOpen(false);
                  setRestoreIdDraft("");
                }}
                isDisabled={restoreMut.isPending}
              >
                {tc("cancel")}
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  const id = restoreIdDraft.trim();
                  if (!id) return;
                  restoreMut.mutate(id);
                }}
                isDisabled={restoreMut.isPending || !restoreIdDraft.trim()}
              >
                {restoreMut.isPending ? t("restoringDo") : t("restoreDo")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardPageTemplate>
  );
}
