import Link from "next/link";
import { formatDate, formatMoney } from "@repo/shared";
import { Button, Card, CardTitle } from "@repo/ui";
import { listStoreProducts } from "@/features/catalog/queries";
import { deleteProduct } from "@/features/products/actions";
import { requireStore } from "@/lib/auth";

export default async function DashboardPage() {
  const store = await requireStore();
  const items = await listStoreProducts(store.id);
  const catalogueValue = items.reduce((total, item) => total + item.priceCents, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex flex-col gap-1">
          <CardTitle className="text-sm font-medium text-neutral-600">Total products</CardTitle>
          <p className="text-2xl font-semibold tracking-tight">{items.length}</p>
        </Card>
        <Card className="flex flex-col gap-1">
          <CardTitle className="text-sm font-medium text-neutral-600">Catalogue value</CardTitle>
          <p className="text-2xl font-semibold tracking-tight">{formatMoney(catalogueValue)}</p>
        </Card>
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-start gap-3">
          <CardTitle>No products yet</CardTitle>
          <p className="text-sm text-neutral-600">
            Add your first listing and it will show up on your store page.
          </p>
          <Link href="/dashboard/products/new">
            <Button>Add a product</Button>
          </Link>
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
                  Price
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Added
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 font-medium text-neutral-900">{item.name}</td>
                  <td className="px-5 py-3 text-neutral-600">{formatMoney(item.priceCents)}</td>
                  <td className="px-5 py-3 text-neutral-600">{formatDate(item.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/dashboard/products/${item.id}/edit`}
                        className="rounded-md px-2 py-1 font-medium text-neutral-900 underline-offset-4 hover:bg-neutral-100"
                      >
                        Edit
                      </Link>
                      <form action={deleteProduct}>
                        <input type="hidden" name="id" value={item.id} />
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
