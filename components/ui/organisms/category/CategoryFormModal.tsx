"use client";

import type {
  Category,
  CategoryCreateBody,
  CategoryUpdateBody,
} from "@/lib/api/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InventorySelect } from "@/components/ui/molecules/InventorySelect";
import { FormEvent, useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  category?: Category | null;
  categories: Category[];
  busy?: boolean;
  onClose: () => void;
  onSubmit: (payload: CategoryCreateBody | CategoryUpdateBody) => void;
};

type FormState = {
  name: string;
  description: string;
  parent_id: string;
  sort_order: string;
};

const emptyState: FormState = {
  name: "",
  description: "",
  parent_id: "",
  sort_order: "",
};

export function CategoryFormModal({
  open,
  mode,
  category,
  categories,
  busy,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyState);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- sync local form when modal opens / entity changes */
  useEffect(() => {
    if (!open) return;
    if (!category || mode === "create") {
      setForm(emptyState);
      setError(null);
      return;
    }
    setForm({
      name: category.name ?? "",
      description: category.description ?? "",
      parent_id: category.parent_id ?? "",
      sort_order:
        typeof category.sort_order === "number" ? String(category.sort_order) : "",
    });
    setError(null);
  }, [open, mode, category]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const parentOptions = useMemo(
    () => categories.filter((c) => c.id !== category?.id),
    [categories, category?.id],
  );

  const parentItems = useMemo(
    () => [
      { id: "", label: "(Tidak ada)" },
      ...parentOptions.map((item) => ({ id: item.id, label: item.name })),
    ],
    [parentOptions],
  );

  if (!open) return null;

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Nama kategori wajib diisi.");
      return;
    }
    let sortOrder: number | undefined;
    const sortText = form.sort_order.trim();
    if (sortText !== "") {
      const n = Number(sortText);
      if (!Number.isInteger(n)) {
        setError("Sort order harus bilangan bulat.");
        return;
      }
      sortOrder = n;
    }

    const payload: CategoryCreateBody | CategoryUpdateBody = {
      name,
      description: form.description.trim() || undefined,
      parent_id: form.parent_id || null,
      sort_order: sortOrder,
    };

    onSubmit(payload);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[min(90vh,40rem)] w-full max-w-xl overflow-y-auto rounded-lg border border-default-200 bg-background p-5 shadow-xl dark:border-default-100">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "Tambah kategori" : "Edit kategori"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-default-500 hover:bg-default-100"
          >
            Tutup
          </button>
        </div>

        <form className="flex flex-col gap-4" onSubmit={submit}>
          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <div className="space-y-2">
            <Label htmlFor="category_name">Nama</Label>
            <Input
              id="category_name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category_description">Deskripsi</Label>
            <Input
              id="category_description"
              name="description"
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
              disabled={busy}
            />
          </div>

          <InventorySelect
            label="Parent"
            fullWidth
            items={parentItems}
            value={form.parent_id}
            onChange={(id) =>
              setForm((s) => ({ ...s, parent_id: id }))
            }
            isDisabled={busy}
          />

          <div className="space-y-2">
            <Label htmlFor="category_sort_order">Sort order</Label>
            <Input
              id="category_sort_order"
              name="sort_order"
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm((s) => ({ ...s, sort_order: e.target.value }))
              }
              disabled={busy}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onPress={onClose}
              isDisabled={busy}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" isDisabled={busy}>
              {busy ? "Menyimpan..." : mode === "create" ? "Simpan" : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
