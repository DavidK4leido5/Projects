import { cn } from "@repo/shared";
import { brand } from "@/lib/brand";

type LogoVariant = "full" | "mark" | "wordmark";
type LogoSize = "sm" | "md" | "lg";

const markSizes: Record<LogoSize, string> = {
  sm: "size-7",
  md: "size-9",
  lg: "size-11",
};

const wordSizes: Record<LogoSize, string> = {
  sm: "text-sm",
  md: "text-[15px]",
  lg: "text-lg",
};

/** Dalorro mark: a flowing line that settles into a gold coin. */
function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 32 32" className="size-[64%]" fill="none" aria-hidden="true">
        <path
          d="M3.5 21.5c4.7 0 7-10.5 12.5-10.5s8 10.5 12.5 10.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="28.5" cy="21.5" r="2.8" fill="var(--gold)" />
      </svg>
    </span>
  );
}

export function Logo({
  variant = "full",
  size = "md",
  className,
  markClassName,
}: {
  variant?: LogoVariant;
  size?: LogoSize;
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      {variant !== "wordmark" ? <LogoMark className={cn(markSizes[size], markClassName)} /> : null}
      {variant !== "mark" ? (
        <span
          className={cn("truncate font-semibold tracking-[-0.025em] leading-none", wordSizes[size])}
        >
          {brand.name}
        </span>
      ) : null}
    </span>
  );
}
