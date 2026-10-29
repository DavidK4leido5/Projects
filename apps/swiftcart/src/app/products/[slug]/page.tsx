import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@repo/shared";
import { getProductBySlug } from "@/features/catalog/queries";
import { AddToCartButton } from "@/components/add-to-cart-button";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product ? product.name : "Product not found" };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        {product.imageKey ? (
          <img
            src={`/api/images/${product.imageKey}`}
            alt={product.name}
            className="aspect-[4/3] w-full rounded-lg border border-neutral-200 object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-neutral-100 text-2xl text-neutral-400">
            {product.name.charAt(0)}
          </div>
        )}
        <div className="flex flex-col items-start gap-3">
          <Link
            href={`/stores/${product.storeSlug}`}
            className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
          >
            {product.storeName}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="text-lg text-neutral-900">{formatMoney(product.priceCents)}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-neutral-600">
            {product.description}
          </p>
          <AddToCartButton productId={product.id} className="mt-4" />
        </div>
      </div>
    </main>
  );
}
