import { Suspense } from "react";
import { formatMoney } from "@repo/shared";
import { Card, CardContent, CardTitle } from "@repo/ui";
import { PageSkeleton } from "@/components/skeletons";
import { ProductManager } from "@/components/product-manager";
import {
  listProductCategories,
  listProductsPage,
  storeProductStats,
} from "@/features/products/queries";
import { requireStoreOwner } from "@/lib/auth/guards";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DashboardBody searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardBody({ searchParams }: { searchParams: SearchParams }) {
  const actor = await requireStoreOwner();
  const params = await searchParams;

  const q = first(params.q).trim();
  const category = first(params.category);
  const sort = first(params.sort) || "new";
  const page = Math.max(Number(first(params.page)) || 1, 1);

  const [stats, products, categories] = await Promise.all([
    storeProductStats(actor.store.id),
    listProductsPage({
      scope: "store",
      storeId: actor.store.id,
      q,
      category,
      sort,
      page,
      perPage: 20,
    }),
    listProductCategories(actor.store.id),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex flex-col gap-1 pt-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items</CardTitle>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{stats.items}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock value</CardTitle>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {formatMoney(stats.stockValueCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-1 pt-5">
            <CardTitle className="text-sm font-medium text-muted-foreground">Featured</CardTitle>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{stats.featured}</p>
          </CardContent>
        </Card>
      </div>

      <ProductManager
        items={products.items}
        scope="store"
        page={products.page}
        pages={products.pages}
        total={products.total}
        q={q}
        category={category}
        sort={sort}
        categories={categories}
      />
    </div>
  );
}
