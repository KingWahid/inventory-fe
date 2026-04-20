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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listProducts } from "@/lib/api/products";
import { listWarehouses } from "@/lib/api/warehouses";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { InventorySelect } from "@/components/ui/molecules/InventorySelect";
import { PageHeader } from "@/components/ui/molecules/PageHeader";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import { useRouter } from "@/i18n/navigation";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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

export default function NewMovementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useTranslations("inventory.movementsNew");
  const tm = useTranslations("inventory.movements");
  const terr = useTranslations("inventory.movementsNew.errors");
  const tc = useTranslations("common");

  const TYPE_OPTIONS: { value: MovementType; label: string }[] = useMemo(
    () => [
      { value: "inbound", label: tm("typeInbound") },
      { value: "outbound", label: tm("typeOutbound") },
      { value: "transfer", label: tm("typeTransfer") },
      { value: "adjustment", label: tm("typeAdjustment") },
    ],
    [tm],
  );

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

  const warehouseList = warehousesQuery.data?.data;
  const productList = productsQuery.data?.data;

  const activeWarehouses = useMemo(
    () => (warehouseList ?? []).filter((w) => w.is_active !== false),
    [warehouseList],
  );

  const warehouseSelectItems = useMemo(
    () => [
      { id: "", label: tc("pick") },
      ...activeWarehouses.map((w) => ({
        id: w.id,
        label: `${w.code} · ${w.name}`,
      })),
    ],
    [activeWarehouses, tc],
  );

  const productSelectItems = useMemo(
    () => [
      { id: "", label: tc("pickProduct") },
      ...(productList ?? []).map((p) => ({
        id: p.id,
        label: `${p.sku} · ${p.name}`,
      })),
    ],
    [productList, tc],
  );

  const createMut = useMutation({
    mutationFn: async (idempotencyKey: string) => {
      const ref = referenceNumber.trim();
      if (!ref) throw new Error(terr("refRequired"));

      const parsedLines: MovementLineCreateBody[] = [];
      for (const row of lines) {
        const pid = row.product_id.trim();
        const qty = Number(row.quantity);
        if (!pid) continue;
        if (!Number.isFinite(qty) || qty < 1 || !Number.isInteger(qty)) {
          throw new Error(terr("lineQty"));
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
        throw new Error(terr("minLines"));
      }

      const notesTrim = movementNotes.trim();
      const notes = notesTrim ? notesTrim : undefined;

      switch (movementType) {
        case "inbound": {
          const d = destinationId.trim();
          if (!d) throw new Error(terr("inboundDest"));
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
          if (!s) throw new Error(terr("outboundSource"));
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
          if (!s || !d) throw new Error(terr("transferBoth"));
          if (s === d) throw new Error(terr("transferDistinct"));
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
          if (!w) throw new Error(terr("adjustWh"));
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
          throw new Error(terr("unknownType"));
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
      <PageHeader
        backHref="/inventory/movements"
        title={t("title")}
        backLabel={t("backList")}
      />

      {createMut.error ? (
        <ApiErrorAlert title={t("draftFailTitle")}>
          {userFacingApiMessage(createMut.error)}
        </ApiErrorAlert>
      ) : null}

      <section className="flex flex-col gap-4 rounded-lg border border-default-200 p-4 dark:border-default-100">
        <div className="flex flex-wrap gap-2">
          <span className="mr-2 text-sm font-medium text-default-700">
            {t("type")}
          </span>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`min-h-11 rounded-md px-3 py-1.5 text-sm font-medium transition-colors sm:min-h-0 ${
                movementType === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-default-300 bg-background hover:bg-default-100 dark:border-default-100"
              }`}
              onClick={() => setMovementType(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="max-w-xl space-y-2">
          <Label htmlFor="reference_number">{t("refLabel")}</Label>
          <Input
            id="reference_number"
            name="reference_number"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder={t("refPlaceholder")}
            autoComplete="off"
          />
        </div>

        <div className="max-w-xl space-y-2">
          <Label htmlFor="movement_notes">{t("movementNotes")}</Label>
          <Input
            id="movement_notes"
            name="movement_notes"
            value={movementNotes}
            onChange={(e) => setMovementNotes(e.target.value)}
          />
        </div>

        {movementType === "inbound" ? (
          <InventorySelect
            label={t("destWh")}
            fullWidth
            className="max-w-xl"
            placeholder={tc("pick")}
            items={warehouseSelectItems}
            value={destinationId}
            onChange={setDestinationId}
          />
        ) : null}

        {movementType === "outbound" ? (
          <InventorySelect
            label={t("sourceWh")}
            fullWidth
            className="max-w-xl"
            placeholder={tc("pick")}
            items={warehouseSelectItems}
            value={sourceId}
            onChange={setSourceId}
          />
        ) : null}

        {movementType === "transfer" ? (
          <div className="flex flex-wrap gap-4">
            <InventorySelect
              label={t("sourceWh")}
              fullWidth
              className="min-w-[200px] flex-1 max-w-none"
              placeholder={tc("pick")}
              items={warehouseSelectItems}
              value={sourceId}
              onChange={setSourceId}
            />
            <InventorySelect
              label={t("destWh")}
              fullWidth
              className="min-w-[200px] flex-1 max-w-none"
              placeholder={tc("pick")}
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
                {t("addStock")}
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-0">
                <input
                  type="radio"
                  name="adjSide"
                  checked={adjustSide === "source"}
                  onChange={() => setAdjustSide("source")}
                />
                {t("reduceStock")}
              </label>
            </div>
            <InventorySelect
              label={t("warehouse")}
              fullWidth
              className="max-w-xl"
              placeholder={tc("pick")}
              items={warehouseSelectItems}
              value={adjustWarehouseId}
              onChange={setAdjustWarehouseId}
            />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("lines")}</h2>
          <Button type="button" variant="secondary" size="sm" onPress={addLine}>
            {t("addRow")}
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-default-200">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="bg-default-100/60 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">{tc("product")}</th>
                <th className="w-24 px-3 py-2 font-semibold">{tc("qty")}</th>
                <th className="min-w-[120px] px-3 py-2 font-semibold">{tc("notes")}</th>
                <th className="w-20 px-3 py-2 text-right font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="border-t border-default-200">
                  <td className="px-3 py-2">
                    <InventorySelect
                      ariaLabel={t("lineProductAria", { n: index + 1 })}
                      className="w-full max-w-xs"
                      variant="secondary"
                      placeholder={tc("pickProduct")}
                      items={productSelectItems}
                      value={line.product_id}
                      onChange={(id) =>
                        updateLine(index, { product_id: id })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      aria-label={t("lineQtyAria", { n: index + 1 })}
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
                      aria-label={t("lineNotesAria", { n: index + 1 })}
                      className="w-full"
                      value={line.notes}
                      onChange={(e) =>
                        updateLine(index, { notes: e.target.value })
                      }
                      placeholder={tc("optional")}
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
                      {t("removeRow")}
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
          {createMut.isPending ? t("saving") : t("saveDraft")}
        </Button>
        <p className="text-xs text-default-500">{t("idempotencyHint")}</p>
      </div>
    </DashboardPageTemplate>
  );
}
