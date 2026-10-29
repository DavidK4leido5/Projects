import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@repo/shared";
import type { ProductCardModel } from "@/features/catalog/queries";

/**
 * Compact, image-led card. The title link stretches over the whole card with
 * ::after, so the card has one target; the store link sits above it (z-10).
 */
export function ProductCard({ product }: { product: ProductCardModel }) {
  const soldOut = product.stock === 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors hover:border-neutral-300 has-[.card-link:focus-visible]:ring-2 has-[.card-link:focus-visible]:ring-neutral-400 has-[.card-link:focus-visible]:ring-offset-2">
      <div className="relative bg-neutral-100">
        {product.coverKey ? (
          <Image
            src={product.coverKey}
            alt={product.name}
            width={640}
            height={640}
            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-3xl text-neutral-300">
            {product.name.charAt(0)}
          </div>
        )}
        {soldOut ? (
          <span className="absolute left-2 top-2 rounded bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700">
            Sold out
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-[13px] font-medium leading-snug text-neutral-900">
          <Link
            href={"/products/" + product.slug}
            className="card-link underline-offset-4 after:absolute after:inset-0 focus-visible:outline-none group-hover:underline"
          >
            {product.name}
          </Link>
        </h3>
        {product.description ? (
          <p className="hidden text-[11px] leading-4 text-neutral-600 sm:line-clamp-2">
            {product.description}
          </p>
        ) : null}
        <Link
          href={"/stores/" + product.storeSlug}
          className="relative z-10 truncate text-[11px] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline focus-visible:text-neutral-900 focus-visible:underline focus-visible:outline-none"
        >
          {product.storeName}
        </Link>

        <div className="mt-auto flex items-baseline justify-between gap-2 pt-1">
          <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
            {formatMoney(product.priceCents)}
          </span>
          <span className="text-right text-[10px] tabular-nums whitespace-nowrap text-neutral-500">
            {soldOut ? "0 left" : product.stock + " left"}
          </span>
        </div>
      </div>
    </article>
  );
}
