import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@repo/shared";
import { Card } from "./card";

type StatCardProps = {
  title: string;
  value: string;
  hint?: string;
  delta?: number;
  deltaLabel?: string;
  icon?: LucideIcon;
  emphasis?: boolean;
  /** Set for metrics where an increase is bad, such as spending. */
  invertDelta?: boolean;
};

function StatCard({
  title,
  value,
  hint,
  delta,
  deltaLabel,
  icon: Icon,
  emphasis,
  invertDelta = false,
}: StatCardProps) {
  const hasDelta = typeof delta === "number";
  const deltaValue = delta ?? 0;
  const good = invertDelta ? deltaValue < 0 : deltaValue > 0;
  const tone =
    !hasDelta || delta === 0 ? "text-muted-foreground" : good ? "text-positive" : "text-negative";
  const DeltaIcon = hasDelta && delta < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <Card
      role="group"
      aria-label={title + ": " + value}
      className={cn("p-5", emphasis && "border-primary/40 bg-accent")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
        {Icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {hint || hasDelta ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {hasDelta ? (
            <span className={cn("inline-flex items-center gap-1 font-medium tabular-nums", tone)}>
              <DeltaIcon className="size-3.5" aria-hidden="true" />
              {(delta > 0 ? "+" : "") + delta + "%"}
            </span>
          ) : null}
          {hint ? <span className="text-muted-foreground">{hint}</span> : null}
          {deltaLabel ? <span className="text-muted-foreground">{deltaLabel}</span> : null}
        </div>
      ) : null}
    </Card>
  );
}

export { StatCard, type StatCardProps };
