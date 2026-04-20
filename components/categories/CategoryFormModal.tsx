"use client";

import type {
  Category,
  CategoryCreateBody,
  CategoryUpdateBody,
} from "@/lib/api/categories";
import { Button, Input, Label, TextField } from "@heroui/react";
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

  const parentOptions = useMemo(
    () => categories.filter((c) => c.id !== category?.id),
    [categories, category?.id],
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
      <div className="w-full max-w-xl rounded-lg border border-default-200 bg-background p-5 shadow-xl dark:border-default-100">
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

          <TextField fullWidth name="name">
            <Label>Nama</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              disabled={busy}
            />
          </TextField>

          <TextField fullWidth name="description">
            <Label>Deskripsi</Label>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
              disabled={busy}
            />
          </TextField>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-default-700">Parent</span>
            <select
              className="rounded-md border border-default-300 bg-background px-3 py-2"
              value={form.parent_id}
              onChange={(e) =>
                setForm((s) => ({ ...s, parent_id: e.target.value }))
              }
              disabled={busy}
            >
              <option value="">(Tidak ada)</option>
              {parentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <TextField fullWidth name="sort_order" type="number">
            <Label>Sort order</Label>
            <Input
              value={form.sort_order}
              onChange={(e) =>
                setForm((s) => ({ ...s, sort_order: e.target.value }))
              }
              disabled={busy}
            />
          </TextField>

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
