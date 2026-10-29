import { Skeleton } from "@repo/ui";

/** The tracker is a page title plus a list of order rows, so the shell matches. */
export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-border pb-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div
        aria-hidden="true"
        className="mt-8 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 text-sm"
          >
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="ml-auto h-3.5 w-16" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
