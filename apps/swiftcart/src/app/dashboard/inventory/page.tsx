import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { InventoryTable } from "@/components/inventory-table";
import { listStoreItems } from "@/features/products/queries";
import { requireStoreOwner } from "@/lib/auth/guards";

export const metadata = { title: "Inventory" };

async function InventoryPageBody() {
  const actor = await requireStoreOwner();
  const items = await listStoreItems(actor.store.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          Stock per variation. Changes save when you leave the field.
        </p>
      </div>

      <InventoryTable items={items} />
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <InventoryPageBody />
    </Suspense>
  );
}
