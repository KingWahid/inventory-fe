"use client";

import { useAuthStore } from "@/stores/auth";
import { useState } from "react";

/** Dev-only: paste a JWT to set Bearer for API calls without the login UI (F3). */
export function AuthTokenBridge() {
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);
  const token = useAuthStore((s) => s.accessToken);
  const [input, setInput] = useState("");

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex max-w-sm flex-col gap-2 rounded-lg border border-default-200 bg-background/95 p-3 text-xs shadow-lg backdrop-blur-sm dark:border-default-100">
      <span className="font-medium text-default-600">Dev token</span>
      <input
        type="password"
        autoComplete="off"
        placeholder="Paste JWT"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="rounded border border-default-200 bg-default-50 px-2 py-1 font-mono text-default-800 dark:border-default-100 dark:bg-default-100"
      />
      <div className="flex gap-2">
        <button
          type="button"
          className="rounded bg-primary px-2 py-1 text-primary-foreground"
          onClick={() => {
            const t = input.trim();
            if (t) setSession(t);
          }}
        >
          Set token
        </button>
        <button
          type="button"
          className="rounded border border-default-300 px-2 py-1"
          onClick={() => {
            clearSession();
            setInput("");
          }}
        >
          Clear
        </button>
      </div>
      {token ? (
        <span className="text-green-600 dark:text-green-400">
          Bearer active ({token.slice(0, 12)}…)
        </span>
      ) : (
        <span className="text-default-500">No token — protected routes may 401.</span>
      )}
    </div>
  );
}
