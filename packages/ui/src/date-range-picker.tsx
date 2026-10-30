"use client";

import * as React from "react";
import { CalendarIcon, ChevronDown, X } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { cn } from "@repo/shared";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type DateRangeValue = { from: Date; to: Date };

type DateRangePickerProps = {
  value?: DateRangeValue;
  onChange: (range: DateRangeValue | undefined) => void;
  presets?: boolean;
  align?: React.ComponentProps<typeof PopoverContent>["align"];
  className?: string;
};

type Preset = {
  label: string;
  getRange: (today: Date) => DateRangeValue;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function startOfMonthsAgo(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() - months, 1);
}

const PRESETS: Preset[] = [
  {
    label: "This month",
    getRange: (today) => ({ from: startOfMonth(today), to: endOfMonth(today) }),
  },
  {
    label: "Last month",
    getRange: (today) => {
      const previous = startOfMonthsAgo(today, 1);
      return { from: previous, to: endOfMonth(previous) };
    },
  },
  {
    label: "Last 3 months",
    getRange: (today) => ({ from: startOfMonthsAgo(today, 2), to: endOfMonth(today) }),
  },
  {
    label: "Last 6 months",
    getRange: (today) => ({ from: startOfMonthsAgo(today, 5), to: endOfMonth(today) }),
  },
  {
    label: "Year to date",
    getRange: (today) => ({ from: new Date(today.getFullYear(), 0, 1), to: today }),
  },
];

function formatDateLabel(date: Date): string {
  return dateFormatter.format(date);
}

function DateRangePicker({
  value,
  onChange,
  presets = true,
  align = "start",
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<DateRange | undefined>();

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setDraft(value ? { from: value.from, to: value.to } : undefined);
    }
  }

  function handleSelect(range: DateRange | undefined) {
    setDraft(range);
    if (range?.from && range.to) {
      onChange({ from: range.from, to: range.to });
    }
  }

  function applyPreset(preset: Preset) {
    const range = preset.getRange(new Date());
    setDraft(range);
    onChange(range);
    setOpen(false);
  }

  function clear() {
    setDraft(undefined);
    onChange(undefined);
    setOpen(false);
  }

  return (
    <div className={cn("flex w-full items-center gap-1 sm:w-auto", className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={value ? "Change date range" : "Choose date range"}
            className={cn(
              "min-w-0 flex-1 justify-start gap-2 font-normal sm:flex-none sm:w-auto",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {value
                ? formatDateLabel(value.from) + " - " + formatDateLabel(value.to)
                : "Select dates"}
            </span>
            <ChevronDown className="ml-auto size-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align={align} className="w-auto p-0">
          <div className="flex flex-col sm:flex-row">
            {presets ? (
              <div className="flex flex-col gap-1 border-b border-border p-2 sm:border-r sm:border-b-0">
                {PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start font-normal"
                    onClick={() => applyPreset(preset)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            ) : null}
            <Calendar
              mode="range"
              selected={draft}
              onSelect={handleSelect}
              defaultMonth={draft?.from ?? value?.from}
              autoFocus
            />
          </div>
        </PopoverContent>
      </Popover>
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label="Clear date range"
          onClick={clear}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  );
}

export { DateRangePicker, type DateRangePickerProps };
