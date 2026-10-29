import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@repo/shared";
import type { ProductCardModel } from "@/features/catalog/queries";

export function ProductCard({ product }: { product: ProductCardModel }) {
  const soldOut = product.stock === 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors hover:border-neutral-300">
      <Link href={"/products/" + product.slug} className="relative block bg-neutral-100">
        {product.coverKey ? (
          <Image
            src={product.coverKey}
            alt={product.name}
            width={640}
            height={640}
            sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="aspect-square w-full object-cover"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center text-3xl text-neutral-300">
            {product.name.charAt(0)}
          </div>
        )}
        {soldOut ? (
          <span className="absolute left-2 top-2 rounded bg-white/95 px-2 py-1 text-[11px] font-medium text-neutral-700">
            Sold out
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link
          href={"/products/" + product.slug}
          className="truncate text-sm font-medium tracking-tight text-neutral-900 underline-offset-4 hover:underline"
        >
          {product.name}
        </Link>
        {product.description ? (
          <p className="line-clamp-2 text-xs leading-5 text-neutral-600">{product.description}</p>
        ) : null}
        <Link
          href={"/stores/" + product.storeSlug}
          className="truncate text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
        >
          {product.storeName}
        </Link>

        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          <span className="text-sm font-semibold tabular-nums">
            {formatMoney(product.priceCents)}
          </span>
          <span className="text-[11px] tabular-nums text-neutral-500">
            {soldOut ? "0 left" : product.stock + " left"}
          </span>
        </div>

        <Link
          href={"/products/" + product.slug}
          className="mt-2 inline-flex items-center justify-center rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-800 transition-colors group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white"
        >
          View product
        </Link>
      </div>
    </article>
  );
}
