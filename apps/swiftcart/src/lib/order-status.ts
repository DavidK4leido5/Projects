export const SLICE_FLOW = ["processing", "packed", "shipped", "delivered"] as const;

export type SliceStatus = (typeof SLICE_FLOW)[number] | "cancelled";

export const STATUS_LABEL: Record<SliceStatus, string> = {
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export function nextStatus(from: SliceStatus): SliceStatus | null {
  if (from === "cancelled" || from === "delivered") return null;
  const index = SLICE_FLOW.indexOf(from);
  return index >= 0 && index < SLICE_FLOW.length - 1 ? SLICE_FLOW[index + 1]! : null;
}

/** The slowest slice decides; all delivered completes; all cancelled cancels. */
export function rollup(slices: SliceStatus[]): string {
  if (slices.length === 0) return "placed";
  if (slices.every((status) => status === "cancelled")) return "cancelled";
  if (slices.every((status) => status === "delivered")) return "completed";
  if (slices.some((status) => status === "delivered")) return "in progress";
  return "processing";
}
