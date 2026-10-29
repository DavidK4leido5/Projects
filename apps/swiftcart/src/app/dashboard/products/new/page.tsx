import { ProductForm } from "@/components/product-form";
import { createProduct } from "@/features/products/actions";
import { requireStoreOwner } from "@/lib/auth/guards";

export default async function NewProductPage() {
  await requireStoreOwner();

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      <ProductForm action={createProduct} />
    </main>
  );
}
