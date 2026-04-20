"use client";

import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { InventorySearchField } from "@/components/ui/molecules/InventorySearchField";
import { InventorySelect } from "@/components/ui/molecules/InventorySelect";
import { WarehouseFormModal } from "@/components/ui/organisms/warehouse/WarehouseFormModal";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
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
import {
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
  | { open: true; mode: "create"; warehouse: null }
  | { open: true; mode: "edit"; warehouse: Warehouse };

const DEFAULT_PER_PAGE = 20;

const SORT_FIELDS = [
  { value: "name", label: "Nama" },
  { value: "code", label: "Kode" },
  { value: "created_at", label: "Dibuat" },
  { value: "updated_at", label: "Diubah" },
  { value: "is_active", label: "Aktif" },
] as const;

const SORT_FILTER_ITEMS = SORT_FIELDS.map((s) => ({
  id: s.value,
  label: s.label,
}));

const ORDER_FILTER_ITEMS = [
  { id: "asc", label: "Naik" },
  { id: "desc", label: "Turun" },
];

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

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
  const totalPages = pagination?.total_pages ?? 1;

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
        <h1 className="text-2xl font-semibold">Gudang</h1>
        <Button
          variant="primary"
          onPress={() =>
            setModalState({ open: true, mode: "create", warehouse: null })
          }
        >
          + Tambah
        </Button>
      </div>

      {mutationError ? (
        <ApiErrorAlert title="Operasi gagal">
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
          label="Cari"
          className="min-w-[200px] flex-1"
          fullWidth
          placeholder="Kode, nama, alamat…"
          value={searchDraft}
          onChange={setSearchDraft}
        />
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-default-600">Urut</span>
          <div className="flex flex-wrap gap-1">
            <InventorySelect
              className="min-w-[8.5rem]"
              items={SORT_FILTER_ITEMS}
              value={sort}
              onChange={(id) =>
                setQueryParams({ page: 1, sort: id })
              }
              ariaLabel="Kolom urut"
            />
            <InventorySelect
              className="min-w-[6rem]"
              items={ORDER_FILTER_ITEMS}
              value={order}
              onChange={(id) =>
                setQueryParams({
                  page: 1,
                  order: id === "desc" ? "desc" : "asc",
                })
              }
              ariaLabel="Arah urut"
            />
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
              <th className="px-3 py-2 font-semibold">Kode</th>
              <th className="px-3 py-2 font-semibold">Nama</th>
              <th className="px-3 py-2 font-semibold">Aktif</th>
              <th className="px-3 py-2 font-semibold">Alamat</th>
              <th className="px-3 py-2 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {listQuery.isLoading ? (
              <tr>
                <td className="px-3 py-6 text-default-500" colSpan={5}>
                  Memuat gudang...
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
                  <td className="px-3 py-2 font-medium">{item.code}</td>
                  <td className="px-3 py-2">{item.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        item.is_active
                          ? "text-success-700 dark:text-success-400"
                          : "text-default-500"
                      }
                    >
                      {item.is_active ? "Ya" : "Tidak"}
                    </span>
                  </td>
                  <td className="max-w-[280px] px-3 py-2 text-default-600">
                    {item.address ? truncateAddress(item.address) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Dropdown>
                      <DropdownTrigger className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-default-200 bg-default-100 px-3 text-sm font-medium text-default-900 hover:bg-default-200 dark:border-default-100 dark:bg-default-50/10 dark:text-default-50 dark:hover:bg-default-50/15">
                        Aksi
                        <IconChevronDown className="size-4 opacity-70" />
                      </DropdownTrigger>
                      <DropdownPopover placement="bottom end">
                        <DropdownMenu
                          aria-label="Aksi gudang"
                          onAction={(key) => {
                            if (key === "edit") {
                              setModalState({
                                open: true,
                                mode: "edit",
                                warehouse: item,
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
            <h3 className="text-lg font-semibold">Hapus gudang</h3>
            <p className="mt-2 text-sm text-default-600">
              Yakin hapus gudang{" "}
              <span className="font-medium">{deleteTarget.name}</span> (
              {deleteTarget.code})?
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
    </DashboardPageTemplate>
  );
}
