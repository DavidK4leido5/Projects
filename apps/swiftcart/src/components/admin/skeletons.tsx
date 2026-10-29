import { Skeleton } from "@repo/ui";

/** Holds the shape of the overview so the shell does not jump when the metrics land. */
export function AdminOverviewSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex h-full flex-col justify-between gap-6 rounded-lg border border-neutral-200 p-5"
          >
            <Skeleton className="h-5 w-20" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1 rounded-lg border border-neutral-200 p-5">
        <Skeleton className="h-6 w-44" />
        <div className="mt-2 flex flex-col divide-y divide-neutral-100">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-baseline justify-between px-2 py-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Holds the create form and the stores table while their data loads. */
export function AdminStoresSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-neutral-200 p-5">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
          <Skeleton className="hidden h-9 w-28 sm:block" />
        </div>
        <Skeleton className="h-5 w-40" />
      </div>

      <div className="overflow-hidden rounded-lg border border-neutral-200">
        <div className="flex items-center gap-6 border-b border-neutral-200 bg-neutral-50 px-5 py-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-4 w-16" />
          ))}
        </div>
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-6 border-b border-neutral-100 px-5 py-2.5 last:border-0"
          >
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="ml-auto h-5 w-8" />
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
