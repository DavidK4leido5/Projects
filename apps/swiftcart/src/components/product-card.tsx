import Link from "next/link";
import { formatMoney } from "@repo/shared";
import type { ProductCardModel } from "@/features/catalog/queries";

export function ProductCard({ product }: { product: ProductCardModel }) {
  const productHref = `/products/${product.slug}`;

  return (
    <article className="overflow-hidden rounded-lg border border-neutral-200 bg-white transition-colors hover:border-neutral-300">
      <Link href={productHref} className="block">
        {product.imageKey ? (
          <img
            src={`/api/images/${product.imageKey}`}
            alt={product.name}
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-neutral-100 text-2xl text-neutral-400">
            {product.name.charAt(0)}
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 p-4">
          <h3 className="text-sm font-semibold tracking-tight">{product.name}</h3>
          <span className="text-sm text-neutral-600">{formatMoney(product.priceCents)}</span>
        </div>
      </Link>
      <div className="px-4 pb-4 text-xs text-neutral-500">
        <Link
          href={`/stores/${product.storeSlug}`}
          className="transition-colors hover:text-neutral-900"
        >
          {product.storeName}
        </Link>
      </div>
    </article>
  );
}
