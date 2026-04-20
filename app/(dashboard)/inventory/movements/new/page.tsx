"use client";

import {
  createAdjustmentDraft,
  createInboundDraft,
  createOutboundDraft,
  createTransferDraft,
  type AdjustmentCreateBody,
  type MovementLineCreateBody,
  type MovementType,
} from "@/lib/api/movements";
import { listProducts } from "@/lib/api/products";
import { listWarehouses } from "@/lib/api/warehouses";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { InventorySelect } from "@/components/ui/molecules/InventorySelect";
import { PageHeader } from "@/components/ui/molecules/PageHeader";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import { queryKeys } from "@/lib/query-keys";
import { Button, Input, Label, TextField } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type LineDraft = {
  product_id: string;
  quantity: string;
  notes: string;
};

const EMPTY_LINE = (): LineDraft => ({
  product_id: "",
  quantity: "1",
  notes: "",
});

const TYPES: { value: MovementType; label: string }[] = [
  { value: "inbound", label: "Inbound" },
  { value: "outbound", label: "Outbound" },
  { value: "transfer", label: "Transfer" },
  { value: "adjustment", label: "Adjustment" },
];

export default function NewMovementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [movementType, setMovementType] = useState<MovementType>("inbound");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [movementNotes, setMovementNotes] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [adjustSide, setAdjustSide] = useState<"source" | "destination">(
    "destination",
  );
  const [adjustWarehouseId, setAdjustWarehouseId] = useState("");
  const [lines, setLines] = useState<LineDraft[]>(() => [EMPTY_LINE()]);

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

  const productsQuery = useQuery({
    queryKey: queryKeys.inventory.products.list({
      page: 1,
      per_page: 500,
      sort: "sku",
      order: "asc",
    }),
    queryFn: () =>
      listProducts({ page: 1, per_page: 500, sort: "sku", order: "asc" }),
  });

  const warehouses = warehousesQuery.data?.data ?? [];
  const products = productsQuery.data?.data ?? [];

  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.is_active !== false),
    [warehouses],
  );

  const warehouseSelectItems = useMemo(
    () => [
      { id: "", label: "— pilih —" },
      ...activeWarehouses.map((w) => ({
        id: w.id,
        label: `${w.code} · ${w.name}`,
      })),
    ],
    [activeWarehouses],
  );

  const productSelectItems = useMemo(
    () => [
      { id: "", label: "— produk —" },
      ...products.map((p) => ({
        id: p.id,
        label: `${p.sku} · ${p.name}`,
      })),
    ],
    [products],
  );

  const createMut = useMutation({
    mutationFn: async (idempotencyKey: string) => {
      const ref = referenceNumber.trim();
      if (!ref) throw new Error("Nomor referensi wajib diisi.");

      const parsedLines: MovementLineCreateBody[] = [];
      for (const row of lines) {
        const pid = row.product_id.trim();
        const qty = Number(row.quantity);
        if (!pid) continue;
        if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
          throw new Error("Setiap baris aktif harus berisi qty bilangan bulat ≥ 1.");
        }
        const note = row.notes.trim();
        const line: MovementLineCreateBody = {
          product_id: pid,
          quantity: qty,
        };
        if (note) line.notes = note;
        parsedLines.push(line);
      }
      if (parsedLines.length === 0) {
        throw new Error("Minimal satu baris dengan produk dan qty valid.");
      }

      const notesTrim = movementNotes.trim();
      const notes = notesTrim ? notesTrim : undefined;

      switch (movementType) {
        case "inbound": {
          const d = destinationId.trim();
          if (!d)
            throw new Error("Pilih gudang tujuan.");
          return createInboundDraft(
            {
              reference_number: ref,
              destination_warehouse_id: d,
              lines: parsedLines,
              notes,
            },
            idempotencyKey,
          );
        }
        case "outbound": {
          const s = sourceId.trim();
          if (!s)
            throw new Error("Pilih gudang asal.");
          return createOutboundDraft(
            {
              reference_number: ref,
              source_warehouse_id: s,
              lines: parsedLines,
              notes,
            },
            idempotencyKey,
          );
        }
        case "transfer": {
          const s = sourceId.trim();
          const d = destinationId.trim();
          if (!s || !d)
            throw new Error("Pilih gudang asal dan tujuan.");
          if (s === d)
            throw new Error("Gudang asal dan tujuan harus berbeda.");
          return createTransferDraft(
            {
              reference_number: ref,
              source_warehouse_id: s,
              destination_warehouse_id: d,
              lines: parsedLines,
              notes,
            },
            idempotencyKey,
          );
        }
        case "adjustment": {
          const w = adjustWarehouseId.trim();
          if (!w)
            throw new Error("Pilih gudang untuk penyesuaian.");
          const body: AdjustmentCreateBody =
            adjustSide === "source"
              ? {
                  reference_number: ref,
                  lines: parsedLines,
                  notes,
                  source_warehouse_id: w,
                }
              : {
                  reference_number: ref,
                  lines: parsedLines,
                  notes,
                  destination_warehouse_id: w,
                };
          return createAdjustmentDraft(body, idempotencyKey);
        }
        default:
          throw new Error("Tipe movement tidak dikenal.");
      }
    },
    onSuccess: (movement) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.movements.all(),
      });
      router.push(`/inventory/movements/${movement.id}`);
    },
  });

  function addLine() {
    setLines((prev) => [...prev, EMPTY_LINE()]);
  }

  function removeLine(index: number) {
    setLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  }

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  return (
    <DashboardPageTemplate>
      <PageHeader backHref="/inventory/movements" title="Buat movement" />

      {createMut.error ? (
        <ApiErrorAlert title="Gagal menyimpan draft">
          {userFacingApiMessage(createMut.error)}
        </ApiErrorAlert>
      ) : null}

      <section className="flex flex-col gap-4 rounded-lg border border-default-200 p-4 dark:border-default-100">
        <div className="flex flex-wrap gap-2">
          <span className="mr-2 text-sm font-medium text-default-700">
            Tipe:
          </span>
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`min-h-11 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
                movementType === t.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-default-300 bg-background hover:bg-default-100 dark:border-default-100"
              }`}
              onClick={() => setMovementType(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <TextField fullWidth className="max-w-xl" name="reference_number">
          <Label>Nomor referensi</Label>
          <Input
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="MOV-..."
            autoComplete="off"
          />
        </TextField>

        <TextField fullWidth className="max-w-xl" name="movement_notes">
          <Label>Catatan movement</Label>
          <Input
            value={movementNotes}
            onChange={(e) => setMovementNotes(e.target.value)}
          />
        </TextField>

        {movementType === "inbound" ? (
          <InventorySelect
            label="Gudang tujuan"
            fullWidth
            className="max-w-xl"
            placeholder="— pilih —"
            items={warehouseSelectItems}
            value={destinationId}
            onChange={setDestinationId}
          />
        ) : null}

        {movementType === "outbound" ? (
          <InventorySelect
            label="Gudang asal"
            fullWidth
            className="max-w-xl"
            placeholder="— pilih —"
            items={warehouseSelectItems}
            value={sourceId}
            onChange={setSourceId}
          />
        ) : null}

        {movementType === "transfer" ? (
          <div className="flex flex-wrap gap-4">
            <InventorySelect
              label="Gudang asal"
              fullWidth
              className="min-w-[200px] flex-1 max-w-none"
              placeholder="— pilih —"
              items={warehouseSelectItems}
              value={sourceId}
              onChange={setSourceId}
            />
            <InventorySelect
              label="Gudang tujuan"
              fullWidth
              className="min-w-[200px] flex-1 max-w-none"
              placeholder="— pilih —"
              items={warehouseSelectItems}
              value={destinationId}
              onChange={setDestinationId}
            />
          </div>
        ) : null}

        {movementType === "adjustment" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-0">
                <input
                  type="radio"
                  name="adjSide"
                  checked={adjustSide === "destination"}
                  onChange={() => setAdjustSide("destination")}
                />
                Tambah stok (gudang tujuan)
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-0">
                <input
                  type="radio"
                  name="adjSide"
                  checked={adjustSide === "source"}
                  onChange={() => setAdjustSide("source")}
                />
                Kurangi stok (gudang asal)
              </label>
            </div>
            <InventorySelect
              label="Gudang"
              fullWidth
              className="max-w-xl"
              placeholder="— pilih —"
              items={warehouseSelectItems}
              value={adjustWarehouseId}
              onChange={setAdjustWarehouseId}
            />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Lines</h2>
          <Button type="button" variant="secondary" size="sm" onPress={addLine}>
            + Baris
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-default-200">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-default-100/60 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Produk</th>
                <th className="w-24 px-3 py-2 font-semibold">Qty</th>
                <th className="min-w-[120px] px-3 py-2 font-semibold">Catatan</th>
                <th className="w-20 px-3 py-2 text-right font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="border-t border-default-200">
                  <td className="px-3 py-2">
                    <InventorySelect
                      ariaLabel={`Produk baris ${index + 1}`}
                      className="w-full max-w-xs"
                      variant="secondary"
                      placeholder="— produk —"
                      items={productSelectItems}
                      value={line.product_id}
                      onChange={(id) =>
                        updateLine(index, { product_id: id })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`Qty baris ${index + 1}`}
                      type="number"
                      min={1}
                      step={1}
                      className="w-full tabular-nums"
                      value={line.quantity}
                      onChange={(e) =>
                        updateLine(index, { quantity: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={`Catatan baris ${index + 1}`}
                      className="w-full"
                      value={line.notes}
                      onChange={(e) =>
                        updateLine(index, { notes: e.target.value })
                      }
                      placeholder="Opsional"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      isDisabled={lines.length <= 1}
                      onPress={() => removeLine(index)}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-default-200 pt-4 dark:border-default-100">
        <Button
          variant="primary"
          onPress={() => createMut.mutate(crypto.randomUUID())}
          isDisabled={createMut.isPending}
        >
          {createMut.isPending ? "Menyimpan…" : "Simpan draft"}
        </Button>
        <p className="text-xs text-default-500">
          Setiap simpan mengirim header <code className="font-mono">Idempotency-Key</code>{" "}
          (UUID baru).
        </p>
      </div>
    </DashboardPageTemplate>
  );
}
