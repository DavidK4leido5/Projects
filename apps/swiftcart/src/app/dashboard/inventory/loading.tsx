import { Skeleton } from "@repo/ui";
import { TableSkeleton } from "@/components/table-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <TableSkeleton rows={8} columns={3} />
    </div>
  );
}
