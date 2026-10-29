"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

export function ProductManager({ items }: { items: StoreItem[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"closed" | "create" | "edit">("closed");
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [deleting, startDelete] = useTransition();

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

  function remove(item: StoreItem) {
    startDelete(async () => {
      const data = new FormData();
      data.set("id", item.id);
      await deleteProduct(data);
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

      {items.length === 0 ? (
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
              {items.map((item) => (
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
                              disabled={deleting}
                              onClick={() => remove(item)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleting ? "Deleting" : "Delete"}
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
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>{mode === "edit" ? "Edit item" : "Add item"}</SheetTitle>
            <SheetDescription>
              Previews and hero banners go to object storage and are mirrored to Cloudinary. The
              first preview is the cover.
            </SheetDescription>
          </SheetHeader>

          {mode === "edit" && editing ? (
            <ProductForm action={updateProduct} product={editing} onCancel={close} />
          ) : null}
          {mode === "create" ? <ProductForm action={createProduct} onCancel={close} /> : null}
        </SheetContent>
      </Sheet>
    </section>
  );
}
