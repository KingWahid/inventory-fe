"use client";

import { buildStockSseUrl } from "@/lib/api/sse-stock-url";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

type ConnStatus = "off" | "connecting" | "live" | "error";

export function StockLiveIndicator() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnStatus>("off");

  useEffect(() => {
    if (!accessToken?.trim()) {
      setStatus("off");
      return;
    }

    setStatus("connecting");
    const url = buildStockSseUrl(accessToken);
    const es = new EventSource(url);

    const onStockChanged = () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.dashboard.summary(),
      });
    };

    es.addEventListener("stock_changed", onStockChanged);
    es.onopen = () => setStatus("live");
    es.onerror = () => setStatus("error");

    return () => {
      es.removeEventListener("stock_changed", onStockChanged);
      es.close();
    };
  }, [accessToken, queryClient]);

  const dotClass =
    status === "live"
      ? "bg-success-500"
      : status === "connecting"
        ? "bg-warning-500 animate-pulse"
        : status === "error"
          ? "bg-warning-500"
          : "bg-default-400";

  const title =
    status === "live"
      ? "Terhubung ke stream stok (SSE)"
      : status === "connecting"
        ? "Menyambung ke stream stok…"
        : status === "error"
          ? "Stream terputus — browser akan mencoba lagi"
          : "Tidak ada sesi — login untuk stok live";

  const line2 =
    status === "error"
      ? "Reconnect otomatis / periksa Redis & Kong"
      : status === "off" && !accessToken
        ? "Login untuk mengaktifkan"
        : status === "connecting"
          ? "Menunggu handshake…"
          : "";

  return (
    <div
      className="rounded-lg border border-default-200 bg-default-50/80 px-3 py-2 text-xs dark:border-default-100 dark:bg-default-50/5"
      title={title}
    >
      <div className="flex items-center gap-2 font-medium text-default-800 dark:text-default-100">
        <span
          className={`inline-block size-2 shrink-0 rounded-full ${dotClass}`}
          aria-hidden
        />
        <span>
          Stok live:{" "}
          {status === "live" ? (
            <span className="text-success-700 dark:text-success-400">ON</span>
          ) : status === "connecting" ? (
            <span className="text-warning-700 dark:text-warning-300">
              menyambung…
            </span>
          ) : status === "error" ? (
            <span className="text-warning-700 dark:text-warning-300">OFF</span>
          ) : (
            <span className="text-default-500">OFF</span>
          )}
        </span>
      </div>
      {line2 ? (
        <div className="mt-1 text-[11px] text-default-500">{line2}</div>
      ) : null}
    </div>
  );
}
