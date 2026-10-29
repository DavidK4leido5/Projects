import { Suspense } from "react";
import { Card } from "@repo/ui";
import { listAdminStores, storeOrderStats, STORES_PER_PAGE } from "@/app/admin/queries";
import { CreateStoreForm } from "@/components/admin/create-store-form";
import { AdminStoresSkeleton } from "@/components/admin/skeletons";
import { StoresTable } from "@/components/admin/stores-table";
import { Pagination } from "@/components/pagination";
import { ResultsRegion } from "@/components/results-region";
import { TableSkeleton } from "@/components/table-skeleton";

type PageProps = {
  searchParams: Promise<{ page?: string }>;
};

async function AdminStoresPageBody({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = Math.max(1, Number(params.page ?? "1") || 1);

  const [stores, orderStats] = await Promise.all([listAdminStores(), storeOrderStats()]);
  const pages = Math.max(1, Math.ceil(stores.length / STORES_PER_PAGE));
  const page = Math.min(requested, pages);
  const visible = stores.slice((page - 1) * STORES_PER_PAGE, page * STORES_PER_PAGE);

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

      <ResultsRegion
        id="admin-stores-results"
        skeleton={<TableSkeleton rows={Math.max(visible.length, 1)} columns={6} />}
      >
        {visible.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-neutral-600">No stores yet.</p>
          </Card>
        ) : (
          <StoresTable stores={visible} orderStats={orderStats} />
        )}
      </ResultsRegion>

      <Pagination page={page} pages={pages} scrollTargetId="admin-stores-results" />
    </div>
  );
}

export default function AdminStoresPage(props: PageProps) {
  return (
    <Suspense fallback={<AdminStoresSkeleton />}>
      <AdminStoresPageBody {...props} />
    </Suspense>
  );
}
