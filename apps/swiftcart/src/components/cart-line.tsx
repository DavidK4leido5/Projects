"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { formatMoney } from "@repo/shared";
import { Button, Card } from "@repo/ui";
import { removeFromCart, setQuantity } from "@/features/cart/actions";
import type { VariantOptions } from "@/lib/db/schema";

export type CartLineItem = {
  id: string;
  quantity: number;
  variantOptions: VariantOptions;
  variantImageKey: string | null;
  productName: string;
  productSlug: string;
  priceCents: number;
  coverKey: string | null;
  stock: number;
  storeName: string;
};

type LineState = { quantity: number; removed: boolean };
type LineAction = { type: "quantity"; quantity: number } | { type: "remove" };

function reduce(state: LineState, action: LineAction): LineState {
  if (action.type === "remove") return { quantity: state.quantity, removed: true };
  return { quantity: action.quantity, removed: state.removed };
}

function optionSummary(options: VariantOptions): string {
  return Object.entries(options)
    .map(([name, value]) => name + ": " + value)
    .join(" · ");
}

export function CartLine({ item }: { item: CartLineItem }) {
  const router = useRouter();
  const [line, apply] = useOptimistic<LineState, LineAction>(
    { quantity: item.quantity, removed: false },
    reduce,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (line.removed) return null;

  const options = optionSummary(item.variantOptions);
  const image = item.variantImageKey ?? item.coverKey;
  const maxQuantity = Math.max(item.stock, 1);

  function change(next: number) {
    const quantity = Math.min(Math.max(next, 1), maxQuantity);
    if (pending || quantity === line.quantity) return;

    setError(null);
    startTransition(async () => {
      apply({ type: "quantity", quantity });
      const result = await setQuantity(item.id, quantity);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  function remove() {
    if (pending) return;

    setError(null);
    startTransition(async () => {
      apply({ type: "remove" });
      const result = await removeFromCart(item.id);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <li>
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link href={"/products/" + item.productSlug} className="shrink-0">
            {image ? (
              <Image
                src={image}
                alt={item.productName}
                width={80}
                height={80}
                className="h-16 w-16 rounded-md border border-neutral-200 object-cover sm:h-20 sm:w-20"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-md bg-neutral-100 text-lg text-neutral-400 sm:h-20 sm:w-20">
                {item.productName.charAt(0)}
              </div>
            )}
          </Link>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Link
              href={"/products/" + item.productSlug}
              className="truncate text-sm font-semibold tracking-tight underline-offset-4 hover:underline"
            >
              {item.productName}
            </Link>
            <span className="text-xs text-neutral-500">{item.storeName}</span>
            {options ? <span className="text-xs text-neutral-600">{options}</span> : null}
            <span className="text-xs text-neutral-500">
              {formatMoney(item.priceCents)} each,{" "}
              {item.stock > 0 ? item.stock + " in stock" : "out of stock"}
            </span>
            {line.quantity > item.stock ? (
              <span className="text-xs text-red-600">
                Only {item.stock} left. Lower the quantity to keep it.
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-md border border-neutral-200">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-r-none"
                onClick={() => change(line.quantity - 1)}
                disabled={pending || line.quantity <= 1}
                aria-label={"Decrease quantity of " + item.productName}
              >
                <Minus aria-hidden="true" />
              </Button>
              <span
                className="min-w-9 text-center text-sm font-medium tabular-nums"
                aria-live="polite"
              >
                {line.quantity}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-l-none"
                onClick={() => change(line.quantity + 1)}
                disabled={pending || line.quantity >= item.stock}
                aria-label={"Increase quantity of " + item.productName}
              >
                <Plus aria-hidden="true" />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              className="px-2 text-neutral-500"
              onClick={remove}
              disabled={pending}
            >
              Remove
            </Button>
          </div>

          <span className="text-sm font-semibold tabular-nums sm:min-w-20 sm:text-right">
            {formatMoney(item.priceCents * line.quantity)}
          </span>
        </div>
      </Card>

      {error ? (
        <p role="alert" className="mt-1 px-1 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </li>
  );
}
