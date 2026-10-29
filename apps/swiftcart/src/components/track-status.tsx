import { Badge } from "@repo/ui";
import { cn } from "@repo/shared";
import { SLICE_FLOW, type SliceStatus } from "@/lib/order-status";

const TONES: Record<string, string> = {
  placed: "border-transparent bg-muted text-muted-foreground",
  processing: "border-transparent bg-amber-100 text-amber-900",
  "in progress": "border-transparent bg-sky-100 text-sky-900",
  completed: "border-transparent bg-emerald-100 text-emerald-900",
  cancelled: "border-transparent bg-red-100 text-red-900",
};

/** The rolled-up status of an order, or the status of one store's slice. */
export function TrackStatus({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", TONES[status] ?? TONES.placed, className)}>
      {status}
    </Badge>
  );
}

/** Where one store's slice stands in the four-step flow. */
export function SliceTimeline({ status }: { status: SliceStatus }) {
  const current = SLICE_FLOW.indexOf(status as (typeof SLICE_FLOW)[number]);

  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {SLICE_FLOW.map((step, index) => {
        const reached = current >= index;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn("h-2 w-2 rounded-full", reached ? "bg-foreground" : "bg-border")}
            />
            <span
              className={cn(
                "text-xs capitalize",
                reached ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step}
            </span>
            {index < SLICE_FLOW.length - 1 ? (
              <span aria-hidden className="h-px w-4 bg-border" />
            ) : null}
          </li>
        );
      })}
      {status === "cancelled" ? <Badge variant="destructive">cancelled</Badge> : null}
    </ol>
  );
}
