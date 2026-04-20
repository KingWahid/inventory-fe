import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  /** Main column gap; default gap-6, list pages often use gap-4 */
  gap?: "gap-4" | "gap-6";
};

const padding =
  "px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8" as const;

export function DashboardPageTemplate({ children, className, gap = "gap-6" }: Props) {
  return (
    <main
      className={cn(
        "flex min-h-full flex-1 flex-col",
        padding,
        gap,
        className,
      )}
    >
      {children}
    </main>
  );
}
