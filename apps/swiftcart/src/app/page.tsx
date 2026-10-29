import Link from "next/link";
import { Button, Card, CardTitle } from "@repo/ui";
import { listProducts } from "@/features/catalog/queries";
import { ProductCard } from "@/components/product-card";

export const metadata = { title: "Shop" };

export default async function Page() {
  const products = await listProducts();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="flex flex-col gap-3 border-b border-neutral-200 pb-10">
        <h1 className="text-3xl font-semibold tracking-tight">Things worth keeping</h1>
        <p className="max-w-xl text-sm text-neutral-600">
          A storefront for independent stores and the products they choose to sell.
        </p>
        <div>
          <Link href="/signup">
            <Button>Open a store</Button>
          </Link>
        </div>
      </section>

      <section className="py-10">
        <h2 className="mb-6 text-lg font-semibold tracking-tight">Latest products</h2>
        {products.length === 0 ? (
          <Card className="flex flex-col items-start gap-3">
            <CardTitle>Nothing listed yet</CardTitle>
            <p className="text-sm text-neutral-600">
              No products have been added yet. Open a store to list the first one.
            </p>
            <Link href="/signup">
              <Button variant="secondary">Open a store</Button>
            </Link>
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
