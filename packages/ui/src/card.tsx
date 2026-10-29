import type { ComponentProps } from "react";
import { cn } from "@repo/shared";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg border border-neutral-200 bg-white p-5 shadow-sm", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return <h2 className={cn("text-base font-semibold text-neutral-900", className)} {...props} />;
}
