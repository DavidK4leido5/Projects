"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui";
import { addToCart } from "@/features/cart/actions";

export function AddToCartButton({
  variantId,
  disabled,
  className,
}: {
  variantId: string;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    start(async () => {
      const result = await addToCart(variantId);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className={className}>
      <Button type="button" onClick={add} disabled={disabled || pending}>
        {pending ? "Adding" : "Add to cart"}
      </Button>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
