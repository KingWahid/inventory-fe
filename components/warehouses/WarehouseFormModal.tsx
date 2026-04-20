"use client";

import type {
  Warehouse,
  WarehouseCreateBody,
  WarehouseUpdateBody,
} from "@/lib/api/warehouses";
import { Button, Input, Label, TextField } from "@heroui/react";
import { FormEvent, useEffect, useState } from "react";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  warehouse?: Warehouse | null;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (payload: WarehouseCreateBody | WarehouseUpdateBody) => void;
};

type FormState = {
  code: string;
  name: string;
  address: string;
  is_active: boolean;
};

const emptyState: FormState = {
  code: "",
  name: "",
  address: "",
  is_active: true,
};

export function WarehouseFormModal({
  open,
  mode,
  warehouse,
  busy,
  onClose,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!warehouse || mode === "create") {
      setForm(emptyState);
      setError(null);
      return;
    }
    setForm({
      code: warehouse.code ?? "",
      name: warehouse.name ?? "",
      address: warehouse.address ?? "",
      is_active: warehouse.is_active ?? true,
    });
    setError(null);
  }, [open, mode, warehouse]);

  if (!open) return null;

  function submit(ev: FormEvent) {
    ev.preventDefault();
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code) {
      setError("Kode wajib diisi.");
      return;
    }
    if (!name) {
      setError("Nama wajib diisi.");
      return;
    }

    const addressTrim = form.address.trim();

    if (mode === "create") {
      onSubmit({
        code,
        name,
        address: addressTrim || undefined,
        is_active: form.is_active,
      } satisfies WarehouseCreateBody);
      return;
    }

    const update: WarehouseUpdateBody = {};
    if (warehouse) {
      if (code !== warehouse.code) update.code = code;
      if (name !== warehouse.name) update.name = name;
      const prevAddr = warehouse.address ?? "";
      if (addressTrim !== prevAddr) update.address = addressTrim;
      if (form.is_active !== warehouse.is_active)
        update.is_active = form.is_active;
    }

    if (Object.keys(update).length === 0) {
      setError("Tidak ada perubahan.");
      return;
    }

    onSubmit(update);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-lg border border-default-200 bg-background p-5 shadow-xl dark:border-default-100">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Gudang — {mode === "create" ? "baru" : "edit"}
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

          <TextField fullWidth name="code">
            <Label>Kode</Label>
            <Input
              value={form.code}
              onChange={(e) =>
                setForm((s) => ({ ...s, code: e.target.value }))
              }
              disabled={busy}
              autoComplete="off"
            />
          </TextField>

          <TextField fullWidth name="name">
            <Label>Nama</Label>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((s) => ({ ...s, name: e.target.value }))
              }
              disabled={busy}
            />
          </TextField>

          <TextField fullWidth name="address">
            <Label>Alamat</Label>
            <Input
              value={form.address}
              onChange={(e) =>
                setForm((s) => ({ ...s, address: e.target.value }))
              }
              disabled={busy}
            />
          </TextField>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-default-300"
              checked={form.is_active}
              onChange={(e) =>
                setForm((s) => ({ ...s, is_active: e.target.checked }))
              }
              disabled={busy}
            />
            <span className="text-default-700">Aktif</span>
          </label>

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
