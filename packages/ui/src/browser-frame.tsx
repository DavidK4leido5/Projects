import type { ReactNode } from "react";
import { cn } from "@repo/shared";

type BrowserFrameProps = {
  url?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  fade?: boolean;
};

function BrowserFrame({
  url = "app.dalorro.app",
  children,
  className,
  contentClassName,
  fade = false,
}: BrowserFrameProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        className,
      )}
    >
      <div className="relative flex items-center border-b border-border bg-muted/50 px-4 py-2.5">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="absolute left-1/2 max-w-[60%] -translate-x-1/2 truncate rounded-full border border-border bg-background px-4 py-1 text-xs text-muted-foreground">
          {url}
        </div>
      </div>
      <div className={cn("relative", contentClassName)}>
        {children}
        {fade ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-card to-transparent"
          />
        ) : null}
      </div>
    </div>
  );
}

export { BrowserFrame, type BrowserFrameProps };
