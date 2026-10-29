import { Suspense } from "react";
import { formatMoney } from "@repo/shared";
import { Card, CardContent, CardTitle } from "@repo/ui";
import { PageSkeleton } from "@/components/skeletons";
import { ProductManager } from "@/components/product-manager";
import { listStoreItems } from "@/features/products/queries";
import { requireStoreOwner } from "@/lib/auth/guards";

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardBody />
    </Suspense>
  );
}

async function DashboardBody() {
  const actor = await requireStoreOwner();
  const items = await listStoreItems(actor.store.id);
  const catalogueValue = items.reduce((total, item) => total + item.priceCents * item.stock, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1 pt-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items</CardTitle>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock value</CardTitle>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatMoney(catalogueValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Featured</CardTitle>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {items.filter((item) => item.featured).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <ProductManager items={items} />
    </div>
  );
}
