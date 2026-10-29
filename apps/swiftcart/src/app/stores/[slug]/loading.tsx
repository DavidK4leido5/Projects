import { ProductGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-neutral-200 pb-6">
        <div className="h-8 w-56 animate-pulse rounded bg-neutral-200/70" />
        <div className="h-4 w-80 animate-pulse rounded bg-neutral-200/70" />
      </div>
      <div className="mt-6">
        <ProductGridSkeleton count={4} />
      </div>
    </main>
  );
}
