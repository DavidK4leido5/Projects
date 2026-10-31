import Link from "next/link";
import { cn } from "@repo/shared";
import { Logo } from "@/components/logo";
import { brand } from "@/lib/brand";

export function Brand({ className, markOnly = false }: { className?: string; markOnly?: boolean }) {
  return (
    <Link
      href="/"
      aria-label={brand.name + " home"}
      className={cn("inline-flex items-center gap-2.5 rounded-md", className)}
    >
      <Logo variant={markOnly ? "mark" : "full"} size="sm" />
    </Link>
  );
}
