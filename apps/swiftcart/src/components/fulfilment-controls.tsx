"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@repo/ui";
import { SLICE_FLOW } from "@/lib/order-status";
import { setFulfilmentStatus } from "@/features/orders/tracking-actions";

const LABELS: Record<string, string> = {
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** One store's slice: the next step, plus cancellation while still processing. */
export function FulfilmentControls({
  token,
  status,
  storeId,
  className,
}: {
  token: string;
  status: string;
  storeId?: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState("");

  const index = SLICE_FLOW.indexOf(status as (typeof SLICE_FLOW)[number]);
  const next = index >= 0 && index < SLICE_FLOW.length - 1 ? SLICE_FLOW[index + 1] : null;

  function move(to: string, note?: string) {
    setError(null);
    start(async () => {
      const result = await setFulfilmentStatus(token, to, note, storeId);
      if (!result.ok) setError(result.error);
      else {
        setCancelling(false);
        setReason("");
      }
      router.refresh();
    });
  }

  return (
    <div className={"flex flex-col gap-2 " + (className ?? "")}>
      <div className="flex flex-wrap items-center gap-2">
        {next ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => move(next)}>
            {pending ? "Saving" : "Mark " + LABELS[next]?.toLowerCase()}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">No further steps</span>
        )}

        {status === "processing" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            disabled={pending}
            onClick={() => setCancelling((value) => !value)}
          >
            Cancel this part
          </Button>
        ) : null}
      </div>

      {cancelling ? (
        <div className="flex flex-col gap-2 rounded-md border border-border p-2">
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason for cancelling"
            className="h-9 rounded-md border border-border px-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => move("cancelled", reason)}
            >
              Confirm cancellation
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setCancelling(false)}>
              Keep it
            </Button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
