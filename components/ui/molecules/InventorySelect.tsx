"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_OPTION_VALUE = "__empty_option__";

export type InventorySelectItem = {
  id: string;
  label: string;
  isDisabled?: boolean;
};

type Props = {
  items: InventorySelectItem[];
  /** Current selected item id */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  fullWidth?: boolean;
  variant?: "primary" | "secondary";
  isDisabled?: boolean;
  className?: string;
  name?: string;
  id?: string;
  /** When `label` is omitted (e.g. toolbar), sets trigger accessibility name */
  ariaLabel?: string;
};

export function InventorySelect({
  items,
  value,
  onChange,
  label,
  placeholder = "Pilih…",
  fullWidth,
  variant = "secondary",
  isDisabled,
  className,
  name,
  id,
  ariaLabel,
}: Props) {
  const disabledKeys: string[] = items
    .filter((i) => i.isDisabled)
    .map((i) => i.id);

  const validIds = new Set(items.map((i) => i.id));
  const selectedKey =
    items.length === 0
      ? null
      : validIds.has(value)
        ? value
        : (items[0]?.id ?? null);
  const selectedValue = selectedKey === "" ? EMPTY_OPTION_VALUE : (selectedKey ?? "");

  return (
    <div className={cn("flex flex-col gap-1", fullWidth && "w-full", className)}>
      {label ? (
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      ) : null}
      <Select
        value={selectedValue}
        onValueChange={(next) =>
          onChange(next === EMPTY_OPTION_VALUE ? "" : next)
        }
        disabled={isDisabled}
        name={name}
      >
        <SelectTrigger
          id={id}
          aria-label={label ? undefined : ariaLabel}
          className={cn("h-11 w-full sm:h-10", variant === "primary" && "border-primary/40")}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem
              key={item.id}
              value={item.id === "" ? EMPTY_OPTION_VALUE : item.id}
              disabled={disabledKeys.includes(item.id)}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
