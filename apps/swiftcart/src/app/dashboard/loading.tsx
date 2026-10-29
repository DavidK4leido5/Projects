import { Skeleton } from "@repo/ui";
import { TableSkeleton } from "@/components/table-skeleton";

/** Stats row, then the products table. The page has no heading of its own. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-5"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <TableSkeleton columns={5} variant="products" />
    </div>
  );
}
