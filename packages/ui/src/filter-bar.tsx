import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@repo/shared";
import { Button } from "./button";

type FilterBarProps = {
  children: ReactNode;
  actions?: ReactNode;
  activeCount?: number;
  onReset?: () => void;
  className?: string;
};

function FilterBar({ children, actions, activeCount, onReset, className }: FilterBarProps) {
  const hasActive = (activeCount ?? 0) > 0;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3",
        className,
      )}
    >
      {children}
      {hasActive || actions ? (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {hasActive ? (
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
              {activeCount} active
            </span>
          ) : null}
          {hasActive && onReset ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="gap-1 text-muted-foreground"
            >
              <X className="size-3.5" aria-hidden="true" />
              Reset
            </Button>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export { FilterBar, type FilterBarProps };
