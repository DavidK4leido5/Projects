/**
 * Mirrors the product page: gallery left, details right. Nothing else, so the
 * shell (header and footer) never appears to be loading.
 */
export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-neutral-200/70" />
          <div className="flex gap-2">
            <div className="h-16 w-16 animate-pulse rounded-md bg-neutral-200/70" />
            <div className="h-16 w-16 animate-pulse rounded-md bg-neutral-200/70" />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="h-3 w-24 animate-pulse rounded bg-neutral-200/70" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-neutral-200/70" />
          <div className="h-5 w-20 animate-pulse rounded bg-neutral-200/70" />
          <div className="h-4 w-full animate-pulse rounded bg-neutral-200/70" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-200/70" />
          <div className="mt-4 h-10 w-36 animate-pulse rounded bg-neutral-200/70" />
        </div>
      </div>
    </main>
  );
}
