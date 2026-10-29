"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";
import { formatMoney } from "@repo/shared";
import { ProductForm } from "@/components/product-form";
import { createProduct, deleteProduct, updateProduct } from "@/features/products/actions";
import type { StoreItem } from "@/features/products/queries";
import type { ProductProperty, VariantOptions } from "@/lib/db/schema";

type Action =
  | { type: "create"; item: StoreItem }
  | { type: "update"; item: StoreItem }
  | { type: "delete"; id: string };

function reducer(state: StoreItem[], action: Action): StoreItem[] {
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
function draftFrom(formData: FormData, base?: StoreItem): StoreItem {
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
  };
}

export function ProductManager({ items }: { items: StoreItem[] }) {
  const router = useRouter();
  const [list, apply] = useOptimistic(items, reducer);
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"closed" | "create" | "edit">("closed");
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setMode("create");
  }

  function openEdit(item: StoreItem) {
    setEditing(item);
    setMode("edit");
  }

  function close() {
    setMode("closed");
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

  function remove(item: StoreItem) {
    setError(null);
    start(async () => {
      apply({ type: "delete", id: item.id });
      const result = await deleteProduct(item.id);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Items</h2>
        <Button onClick={openCreate} size="sm">
          <Plus />
          Add item
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {list.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border px-5 py-10">
          <p className="text-sm text-muted-foreground">
            Nothing listed yet. Add your first item and it shows up on the storefront.
          </p>
          <Button onClick={openCreate} variant="outline" size="sm">
            <Plus />
            Add item
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Cover</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Previews</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.images[0] ? (
                      <Image
                        src={item.images[0]}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-md border border-border object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-muted" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      {item.featured ? <Badge variant="secondary">Hero</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatMoney(item.priceCents)}</TableCell>
                  <TableCell className="tabular-nums">{item.stock}</TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {item.images.length}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                        <Pencil />
                        Edit
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive">
                            <Trash2 />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {item.name} and its {item.images.length} preview
                              {item.images.length === 1 ? "" : "s"} are removed from the storefront
                              and from object storage. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep it</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => remove(item)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={mode !== "closed"} onOpenChange={(open) => (open ? undefined : close())}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>{mode === "edit" ? "Edit item" : "Add item"}</SheetTitle>
            <SheetDescription>
              Previews and hero banners go to object storage and are mirrored to Cloudinary. The
              first preview is the cover.
            </SheetDescription>
          </SheetHeader>

          {mode === "edit" && editing ? (
            <ProductForm
              product={editing}
              pending={pending}
              error={error}
              onSubmit={save}
              onCancel={close}
            />
          ) : null}
          {mode === "create" ? (
            <ProductForm pending={pending} error={error} onSubmit={save} onCancel={close} />
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
