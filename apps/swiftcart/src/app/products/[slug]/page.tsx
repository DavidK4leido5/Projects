import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatMoney } from "@repo/shared";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductGallery } from "@/components/product-gallery";
import { getProductBySlug, listProductSlugs } from "@/features/catalog/queries";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await listProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product ? product.name : "Product not found" };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const inStock = product.stock > 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div className="flex flex-col items-start gap-3">
          <Link
            href={"/stores/" + product.storeSlug}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {product.storeName}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="text-lg text-foreground">{formatMoney(product.priceCents)}</p>
          <p className="text-xs text-muted-foreground">
            {inStock ? product.stock + " in stock" : "Out of stock"}
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {product.description}
          </p>
          {inStock ? (
            <AddToCartButton productId={product.id} className="mt-4" />
          ) : (
            <span className="mt-4 inline-flex items-center rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Out of stock
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
