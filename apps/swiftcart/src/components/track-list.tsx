import Link from "next/link";
import { formatDate, formatMoney } from "@repo/shared";
import { TrackStatus } from "@/components/track-status";
import type { TrackRow } from "@/features/orders/tracking";

export function TrackList({ rows }: { rows: TrackRow[] }) {
  return (
    <ul className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {rows.map((row) => {
        const itemCount = row.slices.reduce((total, slice) => total + slice.itemCount, 0);
        return (
          <li key={row.id}>
            <Link
              href={"/track/" + row.token}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-sm hover:bg-muted/50"
            >
              <span className="font-mono text-xs text-foreground">
                {row.ref ?? row.token.slice(0, 8)}
              </span>
              <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>
              <span className="text-muted-foreground">
                {row.slices.map((slice) => slice.storeName).join(", ") || "No stores yet"}
              </span>
              <span className="text-xs text-muted-foreground">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
              <span className="ml-auto font-medium tabular-nums">
                {formatMoney(row.totalCents)}
              </span>
              <TrackStatus status={row.status} />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
