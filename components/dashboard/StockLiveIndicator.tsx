"use client";

import { buildStockSseUrl } from "@/lib/api/sse-stock-url";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/stores/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

type ConnStatus = "off" | "connecting" | "live" | "error";

export function StockLiveIndicator() {
  const t = useTranslations("dashboard.stockLive");
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnStatus>("off");

  /* eslint-disable react-hooks/set-state-in-effect -- EventSource lifecycle + token presence */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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
      ? t("titleLive")
      : status === "connecting"
        ? t("titleConnecting")
        : status === "error"
          ? t("titleError")
          : t("titleOff");

  const line2 =
    status === "error"
      ? t("hintError")
      : status === "off" && !accessToken
        ? t("hintLogin")
        : status === "connecting"
          ? t("hintConnecting")
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
          {t("badge")}{" "}
          {status === "live" ? (
            <span className="text-success-700 dark:text-success-400">{t("on")}</span>
          ) : status === "connecting" ? (
            <span className="text-warning-700 dark:text-warning-300">
              {t("connectingShort")}
            </span>
          ) : status === "error" ? (
            <span className="text-warning-700 dark:text-warning-300">{t("off")}</span>
          ) : (
            <span className="text-default-500">{t("off")}</span>
          )}
        </span>
      </div>
      {line2 ? (
        <div className="mt-1 text-[11px] text-default-500">{line2}</div>
      ) : null}
    </div>
  );
}
