import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { Pagination } from "@/components/pagination";
import { PageSkeleton } from "@/components/skeletons";
import { InventoryTable } from "@/components/inventory-table";
import { listStoreItems } from "@/features/products/queries";
import { requireStoreOwner } from "@/lib/auth/guards";
import { lifetimes, tags } from "@/lib/cache";

export const metadata = { title: "Inventory" };

const PER_PAGE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/**
 * The store's catalogue is the same for every visit by its owner, so it is
 * cached per store. Only the store id is passed in: no cookies, no session.
 */
async function inventoryFor(storeId: string) {
  "use cache";
  cacheLife(lifetimes.catalogue);
  cacheTag(tags.inventory(storeId), tags.products);

  return listStoreItems(storeId);
}

async function InventoryPageBody({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requireStoreOwner();
  const params = await searchParams;
  const items = await inventoryFor(actor.store.id);

  const pages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const requested = Math.max(Number(first(params.page)) || 1, 1);
  const page = Math.min(requested, pages);
  const pageItems = items.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">Inventory</h2>
        <p className="text-sm text-muted-foreground">
          Stock per variation. Changes save when you leave the field.
        </p>
      </div>

      <InventoryTable items={pageItems} />

      <Pagination
        page={page}
        pages={pages}
        scrollTargetId="inventory-results"
        className="border-t border-border pt-4"
      />
    </div>
  );
}

export default function InventoryPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <InventoryPageBody searchParams={searchParams} />
    </Suspense>
  );
}
