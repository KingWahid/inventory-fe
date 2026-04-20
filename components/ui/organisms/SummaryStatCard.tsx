"use client";

type Props = {
  title: string;
  subtitle?: string;
  value: string;
  loading: boolean;
};

export function SummaryStatCard({
  title,
  subtitle,
  value,
  loading,
}: Props) {
  return (
    <div className="rounded-lg border border-default-200 bg-background p-4 shadow-sm dark:border-default-100">
      <div className="text-xs font-medium uppercase tracking-wide text-default-500">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-0.5 text-xs text-default-500">{subtitle}</div>
      ) : null}
      <div className="mt-2 text-2xl font-semibold tabular-nums">
        {loading ? (
          <span className="inline-block h-8 w-16 animate-pulse rounded bg-default-200 dark:bg-default-800" />
        ) : (
          value
        )}
      </div>
    </div>
  );
}
