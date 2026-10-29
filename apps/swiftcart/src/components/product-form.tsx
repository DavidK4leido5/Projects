"use client";

import { useActionState } from "react";
import { Button, Checkbox, Input, Label, Textarea } from "@repo/ui";
import { emptyFormState, type FormState } from "@/lib/form";
import { ProductImagesField } from "@/components/product-images-field";
import type { StoreItem } from "@/features/products/queries";

type ProductFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  product?: StoreItem;
  onCancel: () => void;
};

export function ProductForm({ action, product, onCancel }: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={product?.name} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product ? (product.priceCents / 100).toFixed(2) : undefined}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            name="stock"
            type="number"
            step="1"
            min="0"
            defaultValue={product ? product.stock : 1}
            required
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={product?.description}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Previews</Label>
        <ProductImagesField initial={product?.images ?? []} />
      </div>

      <label className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5">
        <Checkbox name="featured" defaultChecked={product?.featured ?? false} className="mt-0.5" />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">Feature in the hero</span>
          <span className="text-xs text-muted-foreground">
            Featured products with a cover image rotate at the top of the shop.
          </span>
        </span>
      </label>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : product ? "Save changes" : "Create item"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
