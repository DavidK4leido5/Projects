"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Button } from "@repo/ui";
import { formatMoney } from "@repo/shared";
import { AddToCartButton } from "@/components/add-to-cart-button";
import type { ProductProperty } from "@/lib/db/schema";

export type DetailVariant = {
  id: string;
  options: Record<string, string>;
  priceCents: number | null;
  stock: number;
  imageKey: string | null;
};

type Props = {
  name: string;
  description: string;
  storeName: string;
  storeSlug: string;
  basePriceCents: number;
  images: string[];
  properties: ProductProperty[];
  variants: DetailVariant[];
};

export function ProductDetail({
  name,
  description,
  storeName,
  storeSlug,
  basePriceCents,
  images,
  properties,
  variants,
}: Props) {
  const [chosen, setChosen] = useState<Record<string, string>>(() => {
    const first: Record<string, string> = {};
    for (const property of properties) {
      const best = variants.find(
        (variant) => variant.stock > 0 && Boolean(variant.options[property.name]),
      )?.options[property.name];
      first[property.name] = best ?? property.values[0] ?? "";
    }
    return first;
  });
  const [thumb, setThumb] = useState(0);

  /** Picking a value can invalidate the others, so move them to a real combination. */
  function choose(propertyName: string, value: string) {
    setChosen((current) => {
      const next = { ...current, [propertyName]: value };
      for (const property of properties) {
        if (property.name === propertyName) continue;
        const stillValid = variants.some(
          (variant) =>
            variant.options[propertyName] === value &&
            variant.options[property.name] === next[property.name],
        );
        if (stillValid) continue;
        const fallback = variants.find(
          (variant) => variant.options[propertyName] === value && variant.options[property.name],
        );
        if (fallback) next[property.name] = fallback.options[property.name]!;
      }
      return next;
    });
    setThumb(0);
  }

  // A variant may define fewer options than the item does, so it matches when
  // everything it defines agrees with the current choice.
  const selected = useMemo(
    () =>
      variants.find((variant) =>
        Object.entries(variant.options).every(([name, value]) => chosen[name] === value),
      ),
    [variants, chosen],
  );

  // If the chosen first value has no sub-values, the second picker is noise.
  const firstProperty = properties[0];
  const siblings = firstProperty
    ? variants.filter(
        (variant) => variant.options[firstProperty.name] === chosen[firstProperty.name],
      )
    : variants;
  const hasSubValues = siblings.some((variant) => Object.keys(variant.options).length > 1);
  const visibleProperties = hasSubValues ? properties : properties.slice(0, 1);

  const gallery = selected?.imageKey
    ? [selected.imageKey, ...images.filter((key) => key !== selected.imageKey)]
    : images;

  const current = gallery[thumb] ?? gallery[0];
  const prices = variants.map((variant) => variant.priceCents ?? basePriceCents);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const priceLabel =
    lowest === highest
      ? formatMoney(lowest)
      : "from " + formatMoney(lowest) + " to " + formatMoney(highest);
  const inStock = (selected?.stock ?? 0) > 0;

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        {current ? (
          <Image
            src={current}
            alt={name}
            width={1200}
            height={900}
            sizes="(min-width: 768px) 50vw, 100vw"
            priority
            className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-muted text-2xl text-muted-foreground">
            {name.charAt(0)}
          </div>
        )}

        {gallery.length > 1 ? (
          <ul className="flex flex-wrap gap-2">
            {gallery.map((key, index) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => setThumb(index)}
                  aria-label={"Show preview " + (index + 1)}
                  aria-current={index === thumb}
                  className={
                    "block overflow-hidden rounded-md border transition-colors " +
                    (index === thumb
                      ? "border-foreground"
                      : "border-border hover:border-muted-foreground")
                  }
                >
                  <Image
                    src={key}
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col items-start gap-3">
        <Link
          href={"/stores/" + storeSlug}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {storeName}
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>

        <p className="text-lg text-foreground">
          {selected ? formatMoney(selected.priceCents ?? basePriceCents) : priceLabel}
        </p>

        <p className="text-xs text-muted-foreground">
          {selected
            ? selected.stock > 0
              ? selected.stock + " in stock"
              : "Out of stock in this combination"
            : "Choose an option"}
        </p>

        {visibleProperties.map((property) => (
          <div key={property.name} className="flex w-full flex-col gap-2">
            <span className="text-xs font-medium text-muted-foreground">{property.name}</span>
            <div className="flex flex-wrap gap-2">
              {property.values.map((value) => {
                const isChosen = chosen[property.name] === value;
                const available = variants.some(
                  (variant) =>
                    variant.stock > 0 &&
                    variant.options[property.name] === value &&
                    properties.every(
                      (other) =>
                        other.name === property.name ||
                        variant.options[other.name] === chosen[other.name],
                    ),
                );

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => choose(property.name, value)}
                    aria-pressed={isChosen}
                    className={
                      "rounded-md border px-3 py-1.5 text-xs transition-colors " +
                      (isChosen
                        ? "border-foreground bg-foreground text-background"
                        : available
                          ? "border-border hover:border-muted-foreground"
                          : "border-border/60 text-muted-foreground line-through")
                    }
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
          {description}
        </p>

        {selected ? (
          <div className="mt-2 flex items-center gap-3">
            <AddToCartButton variantId={selected.id} disabled={!inStock} />
            {!inStock ? <Badge variant="secondary">Sold out</Badge> : null}
          </div>
        ) : (
          <Button disabled className="mt-2">
            Choose an option
          </Button>
        )}
      </div>
    </div>
  );
}
