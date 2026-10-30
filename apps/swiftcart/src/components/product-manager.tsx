"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { formatMoney } from "@repo/shared";
import { EntityDrawer } from "@/components/entity-drawer";
import { Pagination } from "@/components/pagination";
import { ProductForm } from "@/components/product-form";
import { ResultsRegion } from "@/components/results-region";
import { RowMenu } from "@/components/row-menu";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableToolbar } from "@/components/table-toolbar";
import { createProduct, deleteProduct, updateProduct } from "@/features/products/actions";
import type { ProductListItem, ProductScope } from "@/features/products/queries";
import { beginPending, useSettlePending } from "@/lib/navigation-pending";
import type { ProductProperty, VariantOptions } from "@/lib/db/schema";

const SORT_OPTIONS = [
  { value: "new", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "stock-asc", label: "Stock: low to high" },
  { value: "stock-desc", label: "Stock: high to low" },
] as const;

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type Action =
  | { type: "create"; item: ProductListItem }
  | { type: "update"; item: ProductListItem }
  | { type: "delete"; id: string };

function reducer(state: ProductListItem[], action: Action): ProductListItem[] {
  if (action.type === "create") return [action.item, ...state];
  if (action.type === "update") {
    return state.map((item) => (item.id === action.item.id ? action.item : item));
  }
  return state.filter((item) => item.id !== action.id);
}

function json<T>(formData: FormData, key: string, fallback: T): T {
  const raw = formData.get(key);
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** The row the table shows while the server catches up. */
function draftFrom(formData: FormData, base?: ProductListItem): ProductListItem {
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(String(formData.get("price") ?? "0").replace(/[^0-9.]/g, ""));
  const images = json<string[]>(formData, "images", []);
  const properties = json<ProductProperty[]>(formData, "properties", []);
  const rawVariants = json<
    { options: VariantOptions; price: string; stock: number; sku: string; imageKey: string }[]
  >(formData, "variants", []);

  const variants = rawVariants.map((variant, index) => ({
    id: base?.variants[index]?.id ?? "draft-" + index,
    options: variant.options,
    priceCents: variant.price ? Math.round(Number(variant.price) * 100) : null,
    stock: Number(variant.stock ?? 0),
    sku: variant.sku || null,
    imageKey: variant.imageKey || null,
  }));

  const stock =
    variants.length > 0
      ? variants.reduce((total, variant) => total + variant.stock, 0)
      : Number(formData.get("stock") ?? 0);

  return {
    id: base?.id ?? "draft-" + Math.random().toString(36).slice(2, 9),
    name,
    description: String(formData.get("description") ?? ""),
    priceCents: Number.isFinite(price) ? Math.round(price * 100) : (base?.priceCents ?? 0),
    stock,
    featured: formData.get("featured") === "on",
    bannerWideKey: String(formData.get("bannerWide") ?? "") || null,
    bannerTallKey: String(formData.get("bannerTall") ?? "") || null,
    slug: base?.slug ?? "#",
    images,
    properties,
    variants,
    category: base?.category ?? null,
    storeId: base?.storeId ?? "",
    storeName: base?.storeName ?? "",
    storeSlug: base?.storeSlug ?? "",
  };
}

export type ProductManagerProps = {
  items: ProductListItem[];
  scope: ProductScope;
  page: number;
  pages: number;
  total: number;
  q: string;
  category: string;
  sort: string;
  categories: string[];
  /** Admin only: selected store id and the options for the store filter. */
  store?: string;
  stores?: { id: string; name: string }[];
};

/**
 * One table for the seller dashboard and the admin products page. Scope only
 * changes the visible columns and the filter set; the drawer and form are the
 * same component in both places.
 */
export function ProductManager({
  items,
  scope,
  page,
  pages,
  total,
  q,
  category,
  sort,
  categories,
  store = "",
  stores = [],
}: ProductManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The URL landing is the end signal for every toolbar navigation.
  const paramsKey = searchParams.toString();
  useSettlePending(paramsKey);
  const [rows, apply] = useOptimistic(items, reducer);
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"closed" | "create" | "edit">("closed");
  const [editing, setEditing] = useState<ProductListItem | null>(null);
  const [deleting, setDeleting] = useState<ProductListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSort = SORT_OPTIONS.some((option) => option.value === sort) ? sort : "new";
  const filtered = Boolean(q || category || activeSort !== "new" || (scope === "admin" && store));

  function openCreate() {
    setEditing(null);
    setMode("create");
  }

  function openEdit(item: ProductListItem) {
    setEditing(item);
    setMode("edit");
  }

  function close() {
    setMode("closed");
  }

  function navigate(next: URLSearchParams, method: "push" | "replace") {
    const query = next.toString();
    const href = query ? pathname + "?" + query : pathname;
    start(() => {
      beginPending();
      if (method === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  function setSearch(value: string) {
    const term = value.trim();
    if (term === q) return;
    const next = new URLSearchParams(searchParams.toString());
    if (term) next.set("q", term);
    else next.delete("q");
    next.delete("page");
    navigate(next, "replace");
  }

  function setFilter(key: "category" | "sort" | "store", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    const cleared = value === "" || (key === "sort" && value === "new");
    if (cleared) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    navigate(next, "push");
  }

  function save(data: FormData) {
    const base = editing ?? undefined;
    const draft = draftFrom(data, base);
    setError(null);
    setMode("closed");

    start(async () => {
      apply(base ? { type: "update", item: draft } : { type: "create", item: draft });
      const result = base ? await updateProduct(data) : await createProduct(data);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  function remove(item: ProductListItem) {
    setError(null);
    setDeleting(null);
    start(async () => {
      apply({ type: "delete", id: item.id });
      const result = await deleteProduct(item.id);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4" aria-busy={pending}>
      {scope === "store" ? (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Items</h2>
          <Button onClick={openCreate} size="sm">
            <Plus />
            Add item
          </Button>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <TableToolbar
        value={q}
        onSearch={setSearch}
        placeholder="Search products"
        count={total}
        countLabel={total === 1 ? "product" : "products"}
        filters={
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Category
              <select
                aria-label="Filter by category"
                value={category}
                onChange={(event) => setFilter("category", event.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">All categories</option>
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Sort
              <select
                aria-label="Sort products"
                value={activeSort}
                onChange={(event) => setFilter("sort", event.target.value)}
                className={SELECT_CLASS}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {scope === "admin" ? (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Store
                <select
                  aria-label="Filter by store"
                  value={store}
                  onChange={(event) => setFilter("store", event.target.value)}
                  className={SELECT_CLASS}
                >
                  <option value="">All stores</option>
                  {stores.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        }
      />

      <ResultsRegion
        id="product-results"
        className="scroll-mt-28"
        skeleton={
          <TableSkeleton rows={20} columns={scope === "admin" ? 6 : 5} variant="products" />
        }
      >
        {rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-5 py-10">
            <p className="text-sm text-muted-foreground">
              {filtered
                ? "No products match these filters."
                : scope === "store"
                  ? "Nothing listed yet. Add your first item and it shows up on the storefront."
                  : "No products yet."}
            </p>
            {!filtered && scope === "store" ? (
              <Button onClick={openCreate} variant="outline" size="sm">
                <Plus />
                Add item
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {/* Cell padding and header height match TableSkeleton, so rows replace the skeleton in place. */}
            <Table className="[&_td]:px-5 [&_td]:py-2.5 [&_th]:h-9 [&_th]:px-5">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  {scope === "admin" ? <TableHead>Store</TableHead> : null}
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => {
                  const cover = item.images[0];
                  return (
                    <TableRow
                      key={item.id}
                      tabIndex={0}
                      className="cursor-pointer"
                      onClick={() => openEdit(item)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        openEdit(item);
                      }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {cover ? (
                            <Image
                              src={cover}
                              alt=""
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0 rounded-md border border-border object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 shrink-0 rounded-md bg-muted" />
                          )}
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium">{item.name}</span>
                            {item.featured ? <Badge variant="secondary">Hero</Badge> : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.category ?? "Uncategorised"}
                      </TableCell>
                      {scope === "admin" ? (
                        <TableCell className="text-muted-foreground">{item.storeName}</TableCell>
                      ) : null}
                      <TableCell className="tabular-nums">{formatMoney(item.priceCents)}</TableCell>
                      <TableCell className="tabular-nums">{item.stock}</TableCell>
                      <TableCell className="text-right">
                        <RowMenu
                          label={"Actions for " + item.name}
                          items={[
                            {
                              label: "Edit",
                              icon: <Pencil />,
                              onSelect: () => openEdit(item),
                            },
                            {
                              label: "View on storefront",
                              icon: <ExternalLink />,
                              onSelect: () =>
                                window.open(
                                  "/products/" + item.slug,
                                  "_blank",
                                  "noopener,noreferrer",
                                ),
                            },
                            {
                              label: "Delete",
                              icon: <Trash2 />,
                              destructive: true,
                              separatorBefore: true,
                              onSelect: () => setDeleting(item),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </ResultsRegion>

      <Pagination page={page} pages={pages} scrollTargetId="product-results" />

      <EntityDrawer
        open={mode !== "closed"}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={mode === "edit" ? "Edit item" : "Add item"}
        description="Previews and hero banners go to object storage and are mirrored to Cloudinary. The first preview is the cover."
      >
        <div className="-mx-6 -my-5 flex min-h-full flex-col">
          {scope === "admin" && editing ? (
            <div className="flex items-baseline gap-2 border-b border-border px-6 py-3 text-sm">
              <span className="text-muted-foreground">Store</span>
              <span className="font-medium">{editing.storeName}</span>
            </div>
          ) : null}

          {mode === "edit" && editing ? (
            <ProductForm
              key={editing.id}
              product={editing}
              pending={pending}
              error={error}
              onSubmit={save}
              onCancel={close}
            />
          ) : null}
          {mode === "create" ? (
            <ProductForm
              key="create"
              pending={pending}
              error={error}
              onSubmit={save}
              onCancel={close}
            />
          ) : null}
        </div>
      </EntityDrawer>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? deleting.name : "This item"} and its{" "}
              {deleting ? deleting.images.length : 0} preview
              {deleting && deleting.images.length === 1 ? "" : "s"} are removed from the storefront
              and from object storage. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) remove(deleting);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
