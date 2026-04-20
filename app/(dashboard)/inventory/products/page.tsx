"use client";

import { ProductFormModal } from "@/components/products/ProductFormModal";
import { listCategories, type Category } from "@/lib/api/categories";
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
import {
  Alert,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
  IconChevronDown,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type ModalState =
  | { open: false }
  | { open: true; mode: "create"; product: null }
  | { open: true; mode: "edit"; product: Product };

const DEFAULT_PER_PAGE = 20;

const SORT_FIELDS = [
  { value: "name", label: "Nama" },
  { value: "sku", label: "SKU" },
  { value: "price", label: "Harga" },
  { value: "created_at", label: "Dibuat" },
  { value: "updated_at", label: "Diubah" },
  { value: "reorder_level", label: "Reorder" },
] as const;

function parsePositiveInt(v: string | null, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export default function InventoryProductsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

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
  const categoryNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categoryRows) {
      m.set(c.id, c.name);
    }
    return m;
  }, [categoryRows]);

  const rows = listQuery.data?.data ?? [];
  const pagination = listQuery.data?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

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
    <main className="flex min-h-full flex-1 flex-col gap-4 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Produk</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onPress={() => setRestoreOpen(true)}>
            Pulihkan…
          </Button>
          <Button
            variant="primary"
            onPress={() =>
              setModalState({ open: true, mode: "create", product: null })
            }
          >
            + Tambah
          </Button>
        </div>
      </div>

      {mutationError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Operasi gagal</Alert.Title>
            <Alert.Description>
              {userFacingApiMessage(mutationError)}
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setQueryParams({ page: 1, search: searchDraft.trim() || undefined });
        }}
      >
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <label className="text-xs font-medium text-default-600">Cari</label>
          <input
            className="w-full rounded-md border border-default-300 bg-background px-3 py-2 text-sm"
            placeholder="Nama, SKU, deskripsi…"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>
        <div className="flex min-w-[180px] flex-col gap-1">
          <label className="text-xs font-medium text-default-600">Kategori</label>
          <select
            className="rounded-md border border-default-300 bg-background px-3 py-2 text-sm"
            value={category_id}
            onChange={(e) => {
              const v = e.target.value.trim();
              setQueryParams({
                page: 1,
                category_id: v || undefined,
              });
            }}
          >
            <option value="">Semua</option>
            {categoryRows.map((c: Category) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
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
                  order: e.target.value === "desc" ? "desc" : "asc",
                })
              }
            >
              <option value="asc">Naik</option>
              <option value="desc">Turun</option>
            </select>
          </div>
        </div>
        <Button type="submit" variant="secondary" className="shrink-0">
          Cari
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-default-200">
        <table className="w-full min-w-[840px] border-collapse text-sm">
          <thead className="bg-default-100/60 text-left">
            <tr>
              <th className="px-3 py-2 font-semibold">SKU</th>
              <th className="px-3 py-2 font-semibold">Nama</th>
              <th className="px-3 py-2 font-semibold">Kategori</th>
              <th className="px-3 py-2 font-semibold">Harga</th>
              <th className="px-3 py-2 font-semibold">Satuan</th>
              <th className="px-3 py-2 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td className="px-3 py-6 text-default-500" colSpan={6}>
                  Memuat produk...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-default-500" colSpan={6}>
                  Belum ada data.
                </td>
              </tr>
            ) : (
              rows.map((item) => (
                <tr key={item.id} className="border-t border-default-200">
                  <td className="px-3 py-2 font-medium">{item.sku}</td>
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2 text-default-600">
                    {item.category_id
                      ? categoryNameById.get(item.category_id) ?? "—"
                      : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {typeof item.price === "number" && Number.isFinite(item.price)
                      ? formatIdr(item.price)
                      : formatIdr(0)}
                  </td>
                  <td className="px-3 py-2 text-default-600">
                    {item.unit || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Dropdown>
                      <DropdownTrigger className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-default-200 bg-default-100 px-3 text-sm font-medium text-default-900 hover:bg-default-200 dark:border-default-100 dark:bg-default-50/10 dark:text-default-50 dark:hover:bg-default-50/15">
                        Aksi
                        <IconChevronDown className="size-4 opacity-70" />
                      </DropdownTrigger>
                      <DropdownPopover placement="bottom end">
                        <DropdownMenu
                          aria-label="Aksi produk"
                          onAction={(key) => {
                            if (key === "edit") {
                              setModalState({
                                open: true,
                                mode: "edit",
                                product: item,
                              });
                            }
                            if (key === "delete") {
                              setDeleteTarget(item);
                            }
                          }}
                        >
                          <DropdownItem key="edit" textValue="Edit">
                            Edit
                          </DropdownItem>
                          <DropdownItem key="delete" textValue="Delete">
                            Delete
                          </DropdownItem>
                        </DropdownMenu>
                      </DropdownPopover>
                    </Dropdown>
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
            <h3 className="text-lg font-semibold">Hapus produk</h3>
            <p className="mt-2 text-sm text-default-600">
              Yakin hapus produk{" "}
              <span className="font-medium">{deleteTarget.name}</span> (
              {deleteTarget.sku})?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="secondary"
                onPress={() => setDeleteTarget(null)}
                isDisabled={deleteMut.isPending}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onPress={() => deleteMut.mutate(deleteTarget.id)}
                isDisabled={deleteMut.isPending}
              >
                {deleteMut.isPending ? "Menghapus..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {restoreOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-default-200 bg-background p-5 shadow-xl dark:border-default-100">
            <h3 className="text-lg font-semibold">Pulihkan produk</h3>
            <p className="mt-2 text-sm text-default-600">
              Masukkan ID produk (UUID) yang di-soft-delete, lalu pulihkan.
            </p>
            <input
              className="mt-3 w-full rounded-md border border-default-300 bg-background px-3 py-2 font-mono text-sm"
              placeholder="uuid produk"
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
                Batal
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
                {restoreMut.isPending ? "Memulihkan..." : "Pulihkan"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
