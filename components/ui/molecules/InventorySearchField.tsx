"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import type { KeyboardEvent } from "react";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  fullWidth?: boolean;
  isDisabled?: boolean;
  "aria-label"?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
};

export function InventorySearchField({
  label,
  value,
  onChange,
  placeholder,
  className,
  fullWidth,
  isDisabled,
  "aria-label": ariaLabel,
  onKeyDown,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-1", fullWidth && "w-full", className)}>
      {label ? (
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      ) : null}
      <div className={cn("relative", fullWidth && "w-full")}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={ariaLabel ?? label ?? "Cari"}
          className="h-11 pr-10 pl-9 sm:h-10"
          placeholder={placeholder}
        value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isDisabled}
        />
        {value ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onChange("")}
            disabled={isDisabled}
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
