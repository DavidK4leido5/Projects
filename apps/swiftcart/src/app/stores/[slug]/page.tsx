import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/ui";
import { getStoreBySlug, listStoreSlugs } from "@/features/catalog/queries";
import { ProductCard } from "@/components/product-card";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getStoreBySlug(slug);
  return { title: data ? data.store.name : "Store not found" };
}

export async function generateStaticParams() {
  const slugs = await listStoreSlugs();
  return slugs.map((slug) => ({ slug }));
}

export default async function StorePage({ params }: PageProps) {
  const { slug } = await params;
  const data = await getStoreBySlug(slug);
  if (!data) notFound();

  const { store, products } = data;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="border-b border-neutral-200 pb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{store.name}</h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-600">{store.tagline}</p>
      </header>

      <section className="py-10">
        <h2 className="mb-6 text-lg font-semibold tracking-tight">Products</h2>
        {products.length === 0 ? (
          <Card className="flex flex-col items-start gap-3">
            <CardTitle>No products yet</CardTitle>
            <p className="text-sm text-neutral-600">This store has not listed anything yet.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
