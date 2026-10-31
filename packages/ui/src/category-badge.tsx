import { cn } from "@repo/shared";

export const categoryColors = [
  "emerald",
  "teal",
  "sky",
  "indigo",
  "violet",
  "rose",
  "amber",
  "orange",
  "slate",
] as const;

const DOT_CLASSES: Record<string, string> = {
  emerald: "bg-chart-1",
  teal: "bg-primary",
  sky: "bg-chart-3",
  indigo: "bg-chart-4",
  violet: "bg-chart-5",
  rose: "bg-negative",
  amber: "bg-gold",
  orange: "bg-destructive",
  slate: "bg-muted-foreground",
};

type CategoryBadgeProps = {
  name: string;
  color?: string;
  className?: string;
};

function CategoryBadge({ name, color = "slate", className }: CategoryBadgeProps) {
  return (
    <span
      aria-label={name + " category"}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted px-2 py-0.5 text-sm text-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 shrink-0 rounded-full", DOT_CLASSES[color] ?? DOT_CLASSES.slate)}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

export { CategoryBadge, type CategoryBadgeProps };
