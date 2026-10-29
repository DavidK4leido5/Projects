import { Suspense } from "react";
import { PageSkeleton } from "@/components/skeletons";
import { ProductManager } from "@/components/product-manager";
import {
  listProductCategories,
  listProductsPage,
  listStoreOptions,
} from "@/features/products/queries";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

async function AdminProductsPageBody({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const q = first(params.q).trim();
  const category = first(params.category);
  const sort = first(params.sort) || "new";
  const store = first(params.store);
  const page = Math.max(Number(first(params.page)) || 1, 1);

  const [products, categories, stores] = await Promise.all([
    listProductsPage({
      scope: "admin",
      storeId: store || undefined,
      q,
      category,
      sort,
      page,
      perPage: 20,
    }),
    listProductCategories(),
    listStoreOptions(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight">Products</h2>
        <p className="text-sm text-muted-foreground">
          Every product across every store. Deleting a product removes it from its store page and
          from all carts.
        </p>
      </div>

      <ProductManager
        items={products.items}
        scope="admin"
        page={products.page}
        pages={products.pages}
        total={products.total}
        q={q}
        category={category}
        sort={sort}
        store={store}
        stores={stores}
        categories={categories}
      />
    </div>
  );
}

export default function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminProductsPageBody searchParams={searchParams} />
    </Suspense>
  );
}
