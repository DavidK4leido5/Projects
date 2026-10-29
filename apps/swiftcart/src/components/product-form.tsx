"use client";

import { useState, type FormEvent } from "react";
import { Button, Checkbox, Input, Label, Textarea } from "@repo/ui";
import { HeroBannerFields } from "@/components/hero-banner-fields";
import { ProductImagesField } from "@/components/product-images-field";
import { VariantFields } from "@/components/variant-fields";
import type { StoreItem } from "@/features/products/queries";

type ProductFormProps = {
  product?: StoreItem;
  pending: boolean;
  error: string | null;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
};

export function ProductForm({ product, pending, error, onSubmit, onCancel }: ProductFormProps) {
  const [featured, setFeatured] = useState(Boolean(product?.featured));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      {featured ? <input type="hidden" name="featured" value="on" /> : null}

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

      <div className="flex flex-col gap-2">
        <Label>Variations</Label>
        <VariantFields
          initialProperties={product?.properties ?? []}
          initialVariants={product?.variants ?? []}
        />
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-start gap-3 rounded-md border border-border px-3 py-2.5">
          <Checkbox
            checked={featured}
            onCheckedChange={(value) => setFeatured(value === true)}
            className="mt-0.5"
          />
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-medium">Feature in the hero</span>
            <span className="text-xs text-muted-foreground">
              Rotates at the top of the shop. Needs two banner images, one per screen shape.
            </span>
          </span>
        </label>

        {featured ? (
          <div className="flex flex-col gap-3 rounded-md border border-border px-3 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">Hero banners</span>
              <span className="text-xs text-muted-foreground">
                Required while this item is featured. The text belongs in the artwork.
              </span>
            </div>
            <HeroBannerFields
              wideInitial={product?.bannerWideKey}
              tallInitial={product?.bannerTallKey}
            />
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
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
