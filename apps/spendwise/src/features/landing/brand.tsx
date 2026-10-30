import Link from "next/link";
import { Wallet } from "lucide-react";
import { cn } from "@repo/shared";
import { site } from "@/features/landing/content";

export function Brand({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={site.name + " home"}
      className={cn("inline-flex items-center gap-2.5 rounded-md", className)}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Wallet className="size-4" aria-hidden />
      </span>
      {markOnly ? null : (
        <span className="text-[15px] font-semibold tracking-tight">{site.name}</span>
      )}
    </Link>
  );
}
