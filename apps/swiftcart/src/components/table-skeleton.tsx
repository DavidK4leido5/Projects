import { Skeleton } from "@repo/ui";

/** "products" is the seller/admin table with a thumbnail column; "text" has none. */
type TableSkeletonVariant = "products" | "text";

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  variant?: TableSkeletonVariant;
};

// Percentage widths: the skeleton must fit the phone without a scrollbar, while
// still looking like ragged text columns instead of a grid of equal bars.
const WIDTHS = ["w-3/4", "w-2/3", "w-1/2", "w-5/6", "w-2/5", "w-4/5", "w-3/5"];

function width(index: number): string {
  return WIDTHS[index % WIDTHS.length] ?? "w-2/3";
}

function range(count: number): number[] {
  return Array.from({ length: Math.max(count, 0) }, (_, index) => index);
}

/**
 * The list table's frame: same cell padding and row rhythm as the real tables,
 * so a page that swaps in rows does not jump when they land.
 */
export function TableSkeleton({ rows = 20, columns = 5, variant = "text" }: TableSkeletonProps) {
  const cells = range(Math.max(columns, 1));
  const bodyRows = range(rows);
  const thumbnail = variant === "products";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full table-fixed text-left text-sm" aria-hidden="true">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            {cells.map((column) => (
              <th
                key={column}
                scope="col"
                className={"px-5 py-3" + (column === 0 && thumbnail ? " w-1/4" : "")}
              >
                <Skeleton className={"h-3 " + width(column + 2)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bodyRows.map((row) => (
            <tr key={row}>
              {cells.map((column) => (
                <td key={column} className="px-5 py-2.5">
                  {column === 0 && thumbnail ? (
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
                      <Skeleton className={"h-4 min-w-0 " + width(row)} />
                    </div>
                  ) : (
                    <Skeleton className={"h-4 " + width(row + column)} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
