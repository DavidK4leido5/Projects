import type { ReactNode } from "react";
import { cn } from "@repo/shared";
import { Card } from "./card";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

function FeatureCard({ icon, title, description, children, className }: FeatureCardProps) {
  return (
    <Card className={cn("flex h-full flex-col gap-4 p-6", className)}>
      <span
        className="grid size-10 place-items-center rounded-lg bg-muted text-foreground"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="space-y-1.5">
        <h3 className="text-base font-medium text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {children ? <div className="mt-6">{children}</div> : null}
    </Card>
  );
}

export { FeatureCard, type FeatureCardProps };
