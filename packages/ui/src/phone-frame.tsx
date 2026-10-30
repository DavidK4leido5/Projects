import type { ReactNode } from "react";
import { cn } from "@repo/shared";

type PhoneFrameProps = {
  children: ReactNode;
  className?: string;
  screenClassName?: string;
};

function PhoneFrame({ children, className, screenClassName }: PhoneFrameProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[20rem] rounded-[2rem] border border-border bg-card p-2 shadow-sm",
        className,
      )}
    >
      <div
        className={cn("relative overflow-hidden rounded-[1.5rem] bg-background", screenClassName)}
      >
        <div
          aria-hidden="true"
          className="absolute top-2 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-muted-foreground/30"
        />
        {children}
      </div>
    </div>
  );
}

export { PhoneFrame, type PhoneFrameProps };
