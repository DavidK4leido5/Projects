import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@repo/shared";

const insightCardVariants = cva(
  "flex items-start gap-3 rounded-lg border border-l-2 border-border bg-card p-4",
  {
    variants: {
      tone: {
        positive: "border-l-positive",
        warning: "border-l-destructive",
        info: "border-l-primary",
      },
    },
    defaultVariants: {
      tone: "info",
    },
  },
);

const iconVariants = cva("flex size-8 shrink-0 items-center justify-center rounded-full", {
  variants: {
    tone: {
      positive: "bg-positive/10 text-positive",
      warning: "bg-destructive/10 text-destructive",
      info: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: {
    tone: "info",
  },
});

type InsightCardProps = {
  tone?: "positive" | "warning" | "info";
  title: string;
  detail: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

function InsightCard({
  tone = "info",
  title,
  detail,
  icon: Icon,
  action,
  className,
}: InsightCardProps) {
  return (
    <section
      role="status"
      data-tone={tone}
      className={cn(insightCardVariants({ tone }), className)}
    >
      {Icon ? (
        <span className={iconVariants({ tone })}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
        {action ? <div className="flex flex-wrap items-center gap-2 pt-1">{action}</div> : null}
      </div>
    </section>
  );
}

export { InsightCard, type InsightCardProps };
