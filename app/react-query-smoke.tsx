"use client";

import { useQuery } from "@tanstack/react-query";

/** F2.2 smoke: ensures useQuery runs under QueryClientProvider (remove when real queries exist). */
export function ReactQuerySmoke() {
  const { data, isSuccess } = useQuery({
    queryKey: ["_smoke"],
    queryFn: () => Promise.resolve("ok"),
  });

  if (!isSuccess) return null;
  return (
    <span data-testid="react-query-smoke" className="sr-only">
      {data}
    </span>
  );
}
