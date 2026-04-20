"use client";

import { cn } from "@/lib/cn";
import { Label, SearchField } from "@heroui/react";
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
  onKeyDown?: (e: KeyboardEvent<Element>) => void;
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
        <Label className="text-xs font-medium text-default-600">{label}</Label>
      ) : null}
      <SearchField
        aria-label={ariaLabel ?? label ?? "Cari"}
        className={cn(fullWidth && "w-full")}
        fullWidth={fullWidth}
        variant="secondary"
        value={value}
        onChange={onChange}
        isDisabled={isDisabled}
      >
        <SearchField.Group className="min-h-11 sm:min-h-10">
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={placeholder} onKeyDown={onKeyDown} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
    </div>
  );
}
