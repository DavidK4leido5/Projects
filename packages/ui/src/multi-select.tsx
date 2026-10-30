"use client";

import * as React from "react";
import { ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@repo/shared";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { ScrollArea } from "./scroll-area";

type MultiSelectOption = { value: string; label: string };

type MultiSelectProps = {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  maxDisplay?: number;
  className?: string;
  emptyText?: string;
};

function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select options",
  searchable = true,
  maxDisplay,
  className,
  emptyText = "No results.",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const baseId = React.useId();

  const selected = new Set(value);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
    : options;
  const selectedLabels = options
    .filter((option) => selected.has(option.value))
    .map((option) => option.label);
  const visibleLabels = maxDisplay ? selectedLabels.slice(0, maxDisplay) : [];
  const hiddenCount = maxDisplay ? selectedLabels.length - visibleLabels.length : 0;

  function toggle(optionValue: string, checked: boolean) {
    onChange(checked ? [...value, optionValue] : value.filter((item) => item !== optionValue));
  }

  function selectAllVisible() {
    onChange(Array.from(new Set([...value, ...filtered.map((option) => option.value)])));
  }

  function clearAll() {
    onChange([]);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  }

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={value.length > 0 ? value.length + " selected" : placeholder}
            className={cn(
              "w-full justify-between gap-2 font-normal",
              value.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate">
                {value.length > 0 ? value.length + " selected" : placeholder}
              </span>
              {visibleLabels.length > 0 ? (
                <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                  {visibleLabels.join(", ")}
                  {hiddenCount > 0 ? " +" + String(hiddenCount) : ""}
                </span>
              ) : null}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) min-w-56 p-0">
          <div className="flex flex-col">
            {searchable ? (
              <div className="border-b border-border p-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search..."
                    aria-label="Search options"
                    className="h-8 pl-8"
                  />
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
              <span className="text-xs tabular-nums text-muted-foreground">
                {value.length} selected
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={selectAllVisible}
                  disabled={filtered.length === 0}
                >
                  Select all
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={clearAll}
                  disabled={value.length === 0}
                >
                  Clear
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-64 [&>[data-slot=scroll-area-viewport]]:max-h-64">
              <div role="group" aria-label="Options" className="p-1">
                {filtered.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                  filtered.map((option) => {
                    const optionId = baseId + "-" + option.value;
                    return (
                      <label
                        key={option.value}
                        htmlFor={optionId}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          id={optionId}
                          checked={selected.has(option.value)}
                          onCheckedChange={(checked) => toggle(option.value, checked === true)}
                        />
                        <span className="truncate">{option.label}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { MultiSelect, type MultiSelectProps };
