import type { ReactNode } from "react";
import { cn } from "@repo/shared";
import { Card } from "./card";

type StepCardProps = {
  number: string;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

function StepCard({ number, title, description, children, className }: StepCardProps) {
  return (
    <Card className={cn("flex h-full flex-col gap-4 p-6", className)}>
      <span className="grid size-9 place-items-center rounded-full border border-border bg-background text-sm font-medium tabular-nums text-foreground">
        {number}
      </span>
      <div className="space-y-1.5">
        <h3 className="text-lg font-medium text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </Card>
  );
}

export { StepCard, type StepCardProps };
