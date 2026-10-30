"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { useDebouncedSearchField } from "@/lib/hooks";

export type TableToolbarProps = {
  value: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  filters?: ReactNode;
  count: number;
  countLabel: string;
};

export function TableToolbar({
  value,
  onSearch,
  placeholder = "Search",
  filters,
  count,
  countLabel,
}: TableToolbarProps) {
  const { input, setInput, pending, flush } = useDebouncedSearchField({
    value,
    onCommit: onSearch,
    delay: 250,
  });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-64">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            flush();
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          aria-busy={pending}
          className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      {filters}
      <p className="ml-auto whitespace-nowrap text-sm text-muted-foreground">
        {count} {countLabel}
      </p>
    </div>
  );
}
