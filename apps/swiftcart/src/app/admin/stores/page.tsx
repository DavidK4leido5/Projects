import { Suspense } from "react";
import { Card } from "@repo/ui";
import { storeOrderStats } from "@/app/admin/queries";
import { CreateStoreForm } from "@/components/admin/create-store-form";
import { AdminStoresSkeleton } from "@/components/admin/skeletons";
import { StoresTable } from "@/components/admin/stores-table";
import { listStoresWithCounts } from "@/features/admin/queries";

async function AdminStoresPageBody() {
  const [stores, orderStats] = await Promise.all([listStoresWithCounts(), storeOrderStats()]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight">
            Give an existing account a store
          </h2>
          <p className="text-sm text-neutral-600">
            The account must already have signed up. Creating a store also switches the account to
            the store role.
          </p>
        </div>
        <CreateStoreForm />
      </Card>

      {stores.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-neutral-600">No stores yet.</p>
        </Card>
      ) : (
        <StoresTable stores={stores} orderStats={Object.fromEntries(orderStats)} />
      )}
    </div>
  );
}

export default function AdminStoresPage() {
  return (
    <Suspense fallback={<AdminStoresSkeleton />}>
      <AdminStoresPageBody />
    </Suspense>
  );
}
