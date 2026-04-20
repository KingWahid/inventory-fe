"use client";

import { AuthTokenBridge } from "@/components/dev/AuthTokenBridge";
import { SessionCookieSync } from "@/components/SessionCookieSync";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionCookieSync />
      {children}
      <AuthTokenBridge />
    </QueryClientProvider>
  );
}
