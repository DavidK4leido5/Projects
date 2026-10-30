import type { ReactNode } from "react";
import { cn } from "@repo/shared";

type SectionHeadingProps = {
  id?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  action?: ReactNode;
};

function SectionHeading({
  id,
  title,
  description,
  align = "center",
  className,
  action,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      <h2
        id={id}
        className="text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="max-w-2xl leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-1 flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export { SectionHeading, type SectionHeadingProps };
