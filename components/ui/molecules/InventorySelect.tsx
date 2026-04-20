"use client";

import { cn } from "@/lib/cn";
import { Label, ListBox, Select } from "@heroui/react";

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

  return (
    <div className={cn("flex flex-col gap-1", fullWidth && "w-full", className)}>
      {label ? (
        <Label className="text-xs font-medium text-default-600">{label}</Label>
      ) : null}
      <Select
        id={id}
        name={name}
        aria-label={label ? undefined : ariaLabel}
        className={cn(fullWidth && "w-full")}
        fullWidth={fullWidth}
        variant={variant}
        placeholder={placeholder}
        isDisabled={isDisabled}
        disabledKeys={disabledKeys.length ? disabledKeys : undefined}
        selectedKey={selectedKey}
        onSelectionChange={(key) => {
          if (key === null) return;
          onChange(String(key));
        }}
      >
        <Select.Trigger className="min-h-11 sm:min-h-10">
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className="max-h-60">
          <ListBox>
            {items.map((item) => (
              <ListBox.Item
                key={item.id}
                id={item.id}
                textValue={item.label}
              >
                {item.label}
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
