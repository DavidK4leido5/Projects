import { rollup, type SliceStatus } from "@/lib/order-status";

/**
 * The row-level status for a list view. `rollup` folds packed and shipped into
 * "processing", which reads wrong beside a slice filter, so a unanimous slice
 * status wins and the flow rollup only breaks ties.
 */
export function orderStatus(statuses: SliceStatus[]): string {
  const first = statuses[0];
  if (!first) return "placed";
  if (statuses.every((status) => status === first)) {
    return first === "delivered" ? "completed" : first;
  }
  return rollup(statuses);
}
