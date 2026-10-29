import { Suspense } from "react";
import Link from "next/link";
import { formatMoney } from "@repo/shared";
import { Button, Card } from "@repo/ui";
import { deleteAnyProduct } from "@/features/admin/actions";
import { listAllProducts } from "@/features/admin/queries";
import { PageSkeleton } from "@/components/skeletons";

async function AdminProductsPageBody() {
  const products = await listAllProducts();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight">Products</h2>
        <p className="text-sm text-neutral-600">
          Every product across every store. Deleting a product removes it from its store page and
          from all carts.
        </p>
      </div>

      {products.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">No products yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Product
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Store
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Price
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="px-5 py-3">
                    <Link
                      href={"/products/" + product.slug}
                      className="font-medium text-neutral-900 underline-offset-4 hover:underline"
                    >
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={"/stores/" + product.storeSlug}
                      className="text-neutral-600 transition-colors hover:text-neutral-900"
                    >
                      {product.storeName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{formatMoney(product.priceCents)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end">
                      <form action={deleteAnyProduct}>
                        <input type="hidden" name="id" value={product.id} />
                        <Button variant="ghost" type="submit" className="px-2 py-1">
                          Delete
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminProductsPageBody />
    </Suspense>
  );
}
