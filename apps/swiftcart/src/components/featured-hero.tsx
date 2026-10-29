import Link from "next/link";
import { formatMoney } from "@repo/shared";
import type { ProductCardModel } from "@/features/catalog/queries";

export function FeaturedHero({ product }: { product: ProductCardModel }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-neutral-800 bg-neutral-950 text-white">
      {product.imageKey ? (
        <>
          <img
            src={"/api/images/" + product.imageKey}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-neutral-950/20" />
        </>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 select-none text-[34rem] font-semibold leading-none text-white/[0.04] md:block"
        >
          {product.name.charAt(0)}
        </span>
      )}

      <div className="relative mx-auto flex min-h-[440px] max-w-6xl flex-col justify-end gap-6 px-4 py-16 sm:px-6 md:min-h-[520px] md:justify-center md:py-24">
        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
          <span className="tabular-nums">{formatMoney(product.priceCents)}</span>
          <span aria-hidden="true" className="h-3 w-px bg-neutral-700" />
          <span className="tabular-nums">{product.stock} in stock</span>
          <span aria-hidden="true" className="h-3 w-px bg-neutral-700" />
          <Link
            href={"/stores/" + product.storeSlug}
            className="underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            {product.storeName}
          </Link>
        </div>

        <h1 className="max-w-[14ch] text-5xl font-semibold uppercase leading-[0.92] tracking-tight sm:text-6xl lg:text-7xl">
          {product.name}
        </h1>

        {product.description ? (
          <p className="max-w-[42ch] text-sm leading-6 text-neutral-300">{product.description}</p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Link
            href={"/products/" + product.slug}
            className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-medium text-neutral-950 transition-colors hover:bg-neutral-200"
          >
            View product
          </Link>
          <Link
            href="#catalogue"
            className="inline-flex items-center justify-center rounded-md border border-neutral-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-neutral-400 hover:bg-neutral-900"
          >
            Browse all
          </Link>
        </div>
      </div>
    </section>
  );
}
