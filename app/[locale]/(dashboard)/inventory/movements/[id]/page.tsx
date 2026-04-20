"use client";

import {
  cancelMovement,
  confirmMovement,
  getMovement,
  type MovementStatus,
} from "@/lib/api/movements";
import { Button } from "@/components/ui/button";
import { listProducts } from "@/lib/api/products";
import { listWarehouses } from "@/lib/api/warehouses";
import { ApiErrorAlert } from "@/components/ui/molecules/ApiErrorAlert";
import { DashboardPageTemplate } from "@/components/ui/templates/DashboardPageTemplate";
import { useRouter } from "@/i18n/navigation";
import { userFacingApiMessage } from "@/lib/api/user-facing-error";
import { queryKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useMemo } from "react";

export default function MovementDetailPage() {
  const t = useTranslations("inventory.movementsDetail");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const idParam = params.id;
  const id = typeof idParam === "string" ? idParam : Array.isArray(idParam) ? idParam[0] : "";

  const queryClient = useQueryClient();

  const movementQuery = useQuery({
    queryKey: queryKeys.inventory.movements.detail(id),
    queryFn: () => getMovement(id),
    enabled: !!id,
  });

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

  const warehouseLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of warehousesQuery.data?.data ?? []) {
      m.set(w.id, `${w.code} · ${w.name}`);
    }
    return m;
  }, [warehousesQuery.data?.data]);

  const productLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of productsQuery.data?.data ?? []) {
      m.set(p.id, `${p.sku} · ${p.name}`);
    }
    return m;
  }, [productsQuery.data?.data]);

  const confirmMut = useMutation({
    mutationFn: () => confirmMovement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.movements.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.movements.detail(id),
      });
    },
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelMovement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.movements.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.movements.detail(id),
      });
    },
  });

  const mutationError = confirmMut.error ?? cancelMut.error;

  if (!id) {
    return (
      <DashboardPageTemplate gap="gap-4">
        <p className="text-default-600">{t("invalid")}</p>
      </DashboardPageTemplate>
    );
  }

  const movement = movementQuery.data;
  const lines = movement?.lines ?? [];

  function headerWarehouseSummary(): string {
    if (!movement) return "";
    const srcId = movement.source_warehouse_id?.trim();
    const dstId = movement.destination_warehouse_id?.trim();
    const src = srcId ? warehouseLabelById.get(srcId) ?? srcId.slice(0, 8) : null;
    const dst = dstId ? warehouseLabelById.get(dstId) ?? dstId.slice(0, 8) : null;
    switch (movement.type) {
      case "inbound":
        return dst ? `→ ${dst}` : "";
      case "outbound":
        return src ? `← ${src}` : "";
      case "transfer":
        return src && dst ? `${src} → ${dst}` : src ?? dst ?? "";
      case "adjustment":
        if (src && dst) return `${src} → ${dst}`;
        if (src) return `− ${src}`;
        if (dst) return `+ ${dst}`;
        return "";
      default:
        return "";
    }
  }

  function formatWhen(iso: string): string {
    const tag = locale === "en" ? "en-US" : "id-ID";
    try {
      return new Date(iso).toLocaleString(tag, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return iso;
    }
  }

  function badgeTone(s: MovementStatus): string {
    switch (s) {
      case "draft":
        return "bg-warning-100 text-warning-900 dark:bg-warning-950/40 dark:text-warning-200";
      case "confirmed":
        return "bg-success-100 text-success-900 dark:bg-success-950/40 dark:text-success-200";
      case "cancelled":
        return "bg-default-200 text-default-800 dark:bg-default-800 dark:text-default-100";
      default:
        return "bg-default-100 text-default-800";
    }
  }

  return (
    <DashboardPageTemplate gap="gap-4">
      <div className="flex flex-wrap items-start gap-3">
        <Button
          variant="secondary"
          size="sm"
          className="min-h-11 sm:min-h-0"
          onPress={() => router.push("/inventory/movements")}
        >
          {t("back")}
        </Button>
      </div>

      {movementQuery.isLoading ? (
        <p className="text-default-600">{t("loading")}</p>
      ) : movementQuery.isError ? (
        <ApiErrorAlert title={t("loadFail")}>
          {userFacingApiMessage(movementQuery.error)}
        </ApiErrorAlert>
      ) : movement ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-default-200 pb-4 dark:border-default-100">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">
                {movement.reference_number}
              </h1>
              <span
                className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${badgeTone(movement.status)}`}
              >
                {movement.status}
              </span>
              <span className="text-default-600">{movement.type}</span>
              {headerWarehouseSummary() ? (
                <span className="truncate text-sm text-default-600">
                  {headerWarehouseSummary()}
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {movement.status === "draft" ? (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onPress={() => confirmMut.mutate()}
                    isDisabled={confirmMut.isPending || cancelMut.isPending}
                  >
                    {confirmMut.isPending ? "…" : t("confirm")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={() => cancelMut.mutate()}
                    isDisabled={confirmMut.isPending || cancelMut.isPending}
                  >
                    {cancelMut.isPending ? "…" : t("cancelMovement")}
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <p className="text-sm text-default-600">
            {t("updated")} {formatWhen(movement.updated_at)}
          </p>

          {mutationError ? (
            <ApiErrorAlert title={t("operationFail")}>
              {userFacingApiMessage(mutationError)}
            </ApiErrorAlert>
          ) : null}

          <div>
            <h2 className="mb-2 text-lg font-semibold">{t("lines")}</h2>
            <div className="overflow-x-auto rounded-lg border border-default-200">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead className="bg-default-100/60 text-left">
                  <tr>
                    <th className="px-3 py-2 font-semibold">{tc("product")}</th>
                    <th className="px-3 py-2 font-semibold">{tc("qty")}</th>
                    <th className="px-3 py-2 font-semibold">{tc("notes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-default-500" colSpan={3}>
                        {t("emptyLines")}
                      </td>
                    </tr>
                  ) : (
                    lines.map((line) => (
                      <tr key={line.id} className="border-t border-default-200">
                        <td className="px-3 py-2">
                          {productLabelById.get(line.product_id) ??
                            line.product_id.slice(0, 8) + "…"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{line.quantity}</td>
                        <td className="px-3 py-2 text-default-600">
                          {line.notes?.trim() ? line.notes : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </DashboardPageTemplate>
  );
}
