import { Skeleton } from "@repo/ui";

/** This page is a stack of order cards, not a table, so the placeholder is cards. */
export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <div className="grid gap-5 px-5 py-4 md:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-24 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
