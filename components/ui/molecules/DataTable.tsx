"use client";

import { cn } from "@/lib/utils";
import { ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

export type DataTableColumn<T> = {
  key: string;
  header: ReactNode;
  sortKey?: string;
  headerClassName?: string;
  cellClassName?: string;
  render: (row: T, index: number) => ReactNode;
};

type SortState = {
  key: string;
  direction: "asc" | "desc";
};

type Props<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  sortState?: SortState;
  onSortChange?: (next: SortState) => void;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  minWidthClassName?: string;
  className?: string;
  rowClassName?: (row: T, index: number) => string | undefined;
};

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sortState,
  onSortChange,
  loading = false,
  loadingText = "Loading...",
  emptyText = "No data.",
  minWidthClassName = "min-w-[720px]",
  className,
  rowClassName,
}: Props<T>) {
  function triggerSort(col: DataTableColumn<T>) {
    if (!col.sortKey || !onSortChange) return;
    const nextDirection =
      sortState?.key === col.sortKey && sortState.direction === "asc"
        ? "desc"
        : "asc";
    onSortChange({ key: col.sortKey, direction: nextDirection });
  }

  return (
    <div className={cn("overflow-x-auto rounded-lg border border-default-200", className)}>
      <table className={cn("w-full border-collapse text-sm", minWidthClassName)}>
        <thead className="bg-default-100/60 text-left">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn("px-3 py-2 font-semibold", col.headerClassName)}
              >
                {col.sortKey ? (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => triggerSort(col)}
                  >
                    <span>{col.header}</span>
                    {sortState?.key === col.sortKey ? (
                      sortState.direction === "asc" ? (
                        <ChevronUp className="size-3.5 opacity-70" />
                      ) : (
                        <ChevronDown className="size-3.5 opacity-70" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3.5 opacity-50" />
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-3 py-6 text-default-500" colSpan={columns.length}>
                {loadingText}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-default-500" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={rowKey(row, rowIndex)}
                className={cn("border-t border-default-200", rowClassName?.(row, rowIndex))}
              >
                {columns.map((col) => (
                  <td key={`${col.key}-${rowIndex}`} className={cn("px-3 py-2", col.cellClassName)}>
                    {col.render(row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
