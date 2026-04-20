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
import { CategoryFormModal } from "@/components/ui/organisms/category/CategoryFormModal";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  createCategory,
  deleteCategory,
  listCategories,
  type Category,
  type CategoryCreateBody,
  type CategoryListParams,
  type CategoryUpdateBody,
  updateCategory,
} from "@/lib/api/categories";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type ModalState =
  | { open: false }
  | { open: true; mode: "create"; category: null }
  | { open: true; mode: "edit"; category: Category };

const DEFAULT_PER_PAGE = 20;

function parsePositiveInt(v: string | null, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export default function InventoryCategoriesPage() {
  const t = useTranslations("inventory.categories");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [searchDraft, setSearchDraft] = useState(searchParams.get("search") ?? "");
  const [modalState, setModalState] = useState<ModalState>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const per_page = parsePositiveInt(searchParams.get("per_page"), DEFAULT_PER_PAGE);
  const search = (searchParams.get("search") ?? "").trim();
  const sort = (searchParams.get("sort") ?? "name").trim();
  const order = (searchParams.get("order") === "desc" ? "desc" : "asc") as
    | "asc"
    | "desc";

  const listParams: CategoryListParams = useMemo(
    () => ({ page, per_page, search: search || undefined, sort, order }),
    [page, per_page, search, sort, order],
  );

  const listQuery = useQuery({
    queryKey: queryKeys.inventory.categories.list(listParams),
    queryFn: () => listCategories(listParams),
  });

  const rows = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;
  const tableColumns: DataTableColumn<Category>[] = useMemo(
    () => [
      {
        key: "name",
        header: t("tableName"),
        sortKey: "name",
        render: (item) => item.name,
      },
      {
        key: "description",
        header: t("tableDescription"),
        sortKey: "description",
        cellClassName: "text-default-600",
        render: (item) => item.description || "-",
      },
      {
        key: "parent",
        header: t("tableParent"),
        sortKey: "parent_id",
        cellClassName: "text-default-600",
        render: (item) => (item.parent_id ? `${item.parent_id.slice(0, 8)}...` : "-"),
      },
      {
        key: "sort",
        header: t("tableSort"),
        sortKey: "sort_order",
        cellClassName: "text-default-600",
        render: (item) => item.sort_order ?? "-",
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
                onClick={() =>
                  setModalState({ open: true, mode: "edit", category: item })
                }
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

  function setQueryParams(next: Partial<CategoryListParams>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged: CategoryListParams = {
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
    mutationFn: (payload: CategoryCreateBody) => createCategory(payload),
    onSuccess: () => {
      setModalState({ open: false });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.categories.all(),
      });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CategoryUpdateBody }) =>
      updateCategory(id, payload),
    onSuccess: () => {
      setModalState({ open: false });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.categories.all(),
      });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.categories.all(),
      });
    },
  });

  const mutationError = createMut.error ?? updateMut.error ?? deleteMut.error;
  const mutationBusy = createMut.isPending || updateMut.isPending;

  return (
    <DashboardPageTemplate gap="gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <Button
          variant="primary"
          onClick={() =>
            setModalState({ open: true, mode: "create", category: null })
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
          className="max-w-md flex-1"
          fullWidth
          placeholder={t("searchPlaceholder")}
          value={searchDraft}
          onChange={setSearchDraft}
          aria-label={t("searchAria")}
        />
        <Button type="submit" variant="secondary">
          {tc("search")}
        </Button>
      </form>

      <DataTable
        columns={tableColumns}
        rows={rows}
        rowKey={(item) => item.id}
        sortState={{ key: sort, direction: order }}
        onSortChange={({ key, direction }) =>
          setQueryParams({ page: 1, sort: key, order: direction })
        }
        loading={listQuery.isLoading}
        loadingText={t("loading")}
        emptyText={tc("noData")}
      />

      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setQueryParams({ page: Math.max(1, page - 1) })}
          disabled={page <= 1}
        >
          {tc("prev")}
        </Button>
        <div className="text-sm text-default-600">
          {tc("pageOf", { page, total: totalPages })}
        </div>
        <Button
          variant="secondary"
          onClick={() => setQueryParams({ page: Math.min(totalPages, page + 1) })}
          disabled={page >= totalPages}
        >
          {tc("next")}
        </Button>
      </div>

      <CategoryFormModal
        open={modalState.open}
        mode={modalState.open ? modalState.mode : "create"}
        category={modalState.open ? modalState.category : null}
        categories={rows}
        busy={mutationBusy}
        onClose={() => setModalState({ open: false })}
        onSubmit={(payload) => {
          if (!modalState.open || modalState.mode === "create") {
            createMut.mutate(payload as CategoryCreateBody);
            return;
          }
          updateMut.mutate({
            id: modalState.category.id,
            payload: payload as CategoryUpdateBody,
          });
        }}
      />

      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-default-200 bg-background p-5 shadow-xl dark:border-default-100">
            <h3 className="text-lg font-semibold">{t("deleteTitle")}</h3>
            <p className="mt-2 text-sm text-default-600">
              {t("deleteConfirm", { name: deleteTarget.name })}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteMut.isPending}
              >
                {tc("cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
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
