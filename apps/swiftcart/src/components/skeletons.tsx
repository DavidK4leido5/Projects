/** Placeholders shaped like the content they stand in for, not spinners. */

function Block({ className }: { className: string }) {
  return <div className={"animate-pulse rounded-md bg-neutral-200/70 " + className} />;
}

export function SessionNavSkeleton() {
  return (
    <div className="ml-auto flex items-center gap-2">
      <Block className="h-8 w-14" />
      <Block className="h-8 w-20" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <Block className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Block className="h-3.5 w-2/3" />
        <Block className="h-3 w-full" />
        <Block className="h-3 w-1/2" />
        <Block className="mt-2 h-7 w-full" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function CatalogueSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
      <Block className="h-3 w-40" />
      <div className="mt-4 flex items-end justify-between gap-3 border-b border-neutral-200 pb-5">
        <div className="flex flex-col gap-2">
          <Block className="h-7 w-48" />
          <Block className="h-3.5 w-40" />
        </div>
        <Block className="h-8 w-28" />
      </div>
      <div className="mt-4 flex gap-2 border-b border-neutral-200 pb-4">
        <Block className="h-8 w-40" />
        <Block className="h-8 w-36" />
        <Block className="h-8 w-24" />
      </div>
      <div className="mt-6">
        <ProductGridSkeleton />
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return <Block className="h-[clamp(300px,40vw,560px)] w-full rounded-none bg-neutral-900/80" />;
}

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Block className="h-8 w-56" />
      <Block className="mt-2 h-3.5 w-72" />
      <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-neutral-100 px-5 py-4 last:border-0"
          >
            <Block className="h-10 w-10" />
            <Block className="h-3.5 w-48" />
            <Block className="ml-auto h-3.5 w-16" />
            <Block className="h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
