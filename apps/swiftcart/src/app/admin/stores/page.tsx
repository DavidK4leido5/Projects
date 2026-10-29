import Link from "next/link";
import { Button, Card, CardTitle } from "@repo/ui";
import { CreateStoreForm, RenameStoreForm } from "@/components/admin-store-form";
import { deleteStore } from "@/features/admin/actions";
import { listStoresWithCounts } from "@/features/admin/queries";

export default async function AdminStoresPage() {
  const stores = await listStoresWithCounts();

  return (
    <div className="flex flex-col gap-8">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Give an existing account a store</CardTitle>
          <p className="text-sm text-neutral-600">
            The account must already have signed up. Creating a store also switches the account to
            the store role.
          </p>
        </div>
        <CreateStoreForm />
      </Card>

      {stores.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">No stores yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Store
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Owner
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Products
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {stores.map((store) => (
                <tr key={store.id}>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-neutral-900">{store.name}</span>
                      <Link
                        href={"/stores/" + store.slug}
                        className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
                      >
                        /stores/{store.slug}
                      </Link>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-neutral-600">{store.ownerEmail}</td>
                  <td className="px-5 py-3 text-neutral-600">{store.productCount}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <RenameStoreForm id={store.id} name={store.name} />
                      <form action={deleteStore}>
                        <input type="hidden" name="id" value={store.id} />
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
