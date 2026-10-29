import { Skeleton } from "@repo/ui";
import { TableSkeleton } from "@/components/table-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <TableSkeleton columns={6} variant="products" />
    </div>
  );
}
