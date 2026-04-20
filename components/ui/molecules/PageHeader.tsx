import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ReactNode } from "react";

const backLinkClass =
  "text-sm font-medium text-primary underline-offset-2 hover:underline";

type Props = {
  title: string;
  /** Back navigation — typically list page */
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  backHref,
  backLabel = "← Kembali ke daftar",
  actions,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {backHref ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={backHref} className={backLinkClass}>
            {backLabel}
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {actions}
      </div>
    </div>
  );
}
