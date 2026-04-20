"use client";

import { useAuthStore } from "@/stores/auth";
import { useState } from "react";

/** Dev-only: paste access (and optionally refresh) JWT for API calls without login UI. */
export function AuthTokenBridge() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const [accessInput, setAccessInput] = useState("");
  const [refreshInput, setRefreshInput] = useState("");

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex max-w-sm flex-col gap-2 rounded-lg border border-default-200 bg-background/95 p-3 text-xs shadow-lg backdrop-blur-sm dark:border-default-100">
      <span className="font-medium text-default-600">Dev tokens</span>
      <input
        type="password"
        autoComplete="off"
        placeholder="Access JWT"
        value={accessInput}
        onChange={(e) => setAccessInput(e.target.value)}
        className="rounded border border-default-200 bg-default-50 px-2 py-1 font-mono text-default-800 dark:border-default-100 dark:bg-default-100"
      />
      <input
        type="password"
        autoComplete="off"
        placeholder="Refresh JWT (optional)"
        value={refreshInput}
        onChange={(e) => setRefreshInput(e.target.value)}
        className="rounded border border-default-200 bg-default-50 px-2 py-1 font-mono text-default-800 dark:border-default-100 dark:bg-default-100"
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-primary px-2 py-1 text-primary-foreground"
          onClick={() => {
            const a = accessInput.trim();
            if (!a) return;
            const r = refreshInput.trim();
            setSession(a, r);
          }}
        >
          Set tokens
        </button>
        <button
          type="button"
          className="rounded border border-default-300 px-2 py-1"
          onClick={() => {
            clearSession();
            setAccessInput("");
            setRefreshInput("");
          }}
        >
          Clear
        </button>
      </div>
      {accessToken ? (
        <span className="text-green-600 dark:text-green-400">
          Access active ({accessToken.slice(0, 12)}…)
          {refreshToken ? " · refresh set" : ""}
        </span>
      ) : (
        <span className="text-default-500">No token — protected routes may 401.</span>
      )}
    </div>
  );
}
