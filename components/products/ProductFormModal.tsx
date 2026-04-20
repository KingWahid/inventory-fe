"use client";

import type { Category } from "@/lib/api/categories";
import type {
  Product,
  ProductCreateBody,
  ProductUpdateBody,
} from "@/lib/api/products";
import { formatIdr } from "@/lib/format/currency";
import { Button, Input, Label, TextField } from "@heroui/react";
import { FormEvent, useEffect, useState } from "react";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  product?: Product | null;
  categories: Category[];
  busy?: boolean;
  onClose: () => void;
  onSubmit: (payload: ProductCreateBody | ProductUpdateBody) => void;
};

type FormState = {
  sku: string;
  name: string;
  category_id: string;
  price: string;
  description: string;
  unit: string;
  reorder_level: string;
};

const emptyState: FormState = {
  sku: "",
  name: "",
  category_id: "",
  price: "",
  description: "",
  unit: "",
  reorder_level: "",
};

export function ProductFormModal({
  open,
  mode,
  product,
  categories,
  busy,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!product || mode === "create") {
      setForm(emptyState);
      setError(null);
      return;
    }
    setForm({
      sku: product.sku ?? "",
      name: product.name ?? "",
      category_id: product.category_id ?? "",
      price:
        typeof product.price === "number" && Number.isFinite(product.price)
          ? String(product.price)
          : "",
      description: product.description ?? "",
      unit: product.unit ?? "",
      reorder_level:
        typeof product.reorder_level === "number"
          ? String(product.reorder_level)
          : "",
    });
    setError(null);
  }, [open, mode, product]);

  if (!open) return null;

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const sku = form.sku.trim();
    const name = form.name.trim();
    if (!sku) {
      setError("SKU wajib diisi.");
      return;
    }
    if (!name) {
      setError("Nama wajib diisi.");
      return;
    }

    const priceText = form.price.trim();
    let priceForPayload: number | undefined;
    if (priceText !== "") {
      const n = Number(priceText);
      if (!Number.isFinite(n) || n < 0) {
        setError("Harga harus berupa angka tidak negatif.");
        return;
      }
      priceForPayload = n;
    }

    let reorder_level: number | undefined;
    const rlText = form.reorder_level.trim();
    if (rlText !== "") {
      const n = Number(rlText);
      if (!Number.isInteger(n) || n < 0) {
        setError("Reorder level harus bilangan bulat tidak negatif.");
        return;
      }
      reorder_level = n;
    }

    const category_id = form.category_id.trim() || null;

    if (mode === "create") {
      onSubmit({
        sku,
        name,
        category_id,
        description: form.description.trim() || undefined,
        unit: form.unit.trim() || undefined,
        price: priceForPayload,
        reorder_level,
      } satisfies ProductCreateBody);
      return;
    }

    const update: ProductUpdateBody = {};
    if (product) {
      if (sku !== product.sku) update.sku = sku;
      if (name !== product.name) update.name = name;
      const prevCat = product.category_id ?? "";
      if (category_id !== prevCat) update.category_id = category_id;
      const prevDesc = product.description ?? "";
      if (form.description.trim() !== prevDesc)
        update.description = form.description.trim() || undefined;
      const prevUnit = product.unit ?? "";
      if (form.unit.trim() !== prevUnit)
        update.unit = form.unit.trim() || undefined;
      const prevPriceNum =
        typeof product.price === "number" && Number.isFinite(product.price)
          ? product.price
          : 0;
      const nextPriceNum =
        priceText === "" ? 0 : (priceForPayload ?? 0);
      if (nextPriceNum !== prevPriceNum) update.price = nextPriceNum;
      const prevRl =
        typeof product.reorder_level === "number"
          ? product.reorder_level
          : undefined;
      if (reorder_level !== prevRl) update.reorder_level = reorder_level;
    }

    if (Object.keys(update).length === 0) {
      setError("Tidak ada perubahan.");
      return;
    }

    onSubmit(update);
  }

  const previewPrice =
    form.price.trim() === ""
      ? null
      : Number.isFinite(Number(form.price.trim()))
        ? Number(form.price.trim())
        : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg border border-default-200 bg-background p-5 shadow-xl dark:border-default-100">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Produk — {mode === "create" ? "baru" : "edit"}
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

          <TextField fullWidth name="sku">
            <Label>SKU</Label>
            <Input
              value={form.sku}
              onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
              disabled={busy}
            />
          </TextField>

          <TextField fullWidth name="name">
            <Label>Nama</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              disabled={busy}
            />
          </TextField>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-default-700">Kategori</span>
            <select
              className="rounded-md border border-default-300 bg-background px-3 py-2"
              value={form.category_id}
              onChange={(e) =>
                setForm((s) => ({ ...s, category_id: e.target.value }))
              }
              disabled={busy}
            >
              <option value="">(Tanpa kategori)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <TextField fullWidth name="price" inputMode="decimal">
            <Label>Harga (IDR)</Label>
            <Input
              value={form.price}
              onChange={(e) =>
                setForm((s) => ({ ...s, price: e.target.value }))
              }
              disabled={busy}
              placeholder="0"
            />
          </TextField>
          {previewPrice !== null ? (
            <p className="text-xs text-default-500">
              Pratinjau: {formatIdr(previewPrice)}
            </p>
          ) : null}

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

          <TextField fullWidth name="unit">
            <Label>Satuan</Label>
            <Input
              value={form.unit}
              onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
              disabled={busy}
              placeholder="pcs"
            />
          </TextField>

          <TextField fullWidth name="reorder_level" type="number">
            <Label>Reorder level</Label>
            <Input
              value={form.reorder_level}
              onChange={(e) =>
                setForm((s) => ({ ...s, reorder_level: e.target.value }))
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
              {busy ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
