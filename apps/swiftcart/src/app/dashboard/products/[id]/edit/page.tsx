import { notFound } from "next/navigation";
import { Button } from "@repo/ui";
import { ProductForm } from "@/components/product-form";
import { listStoreProducts } from "@/features/catalog/queries";
import { deleteProduct, updateProduct } from "@/features/products/actions";
import { requireStore } from "@/lib/auth";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await requireStore();
  const items = await listStoreProducts(store.id);
  const product = items.find((item) => item.id === id);
  if (!product) notFound();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
      <ProductForm action={updateProduct} product={product} />

      <form action={deleteProduct} className="flex flex-col gap-3 border-t border-neutral-200 pt-6">
        <input type="hidden" name="id" value={product.id} />
        <div>
          <Button type="submit" variant="secondary" className="text-red-600 hover:text-red-700">
            Delete product
          </Button>
        </div>
      </form>
    </main>
  );
}
