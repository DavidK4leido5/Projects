import { Button } from "@repo/ui";
import { addToCart } from "@/features/cart/actions";

type AddToCartButtonProps = {
  variantId: string;
  disabled?: boolean;
  className?: string;
};

export function AddToCartButton({ variantId, disabled, className }: AddToCartButtonProps) {
  return (
    <form action={addToCart} className={className}>
      <input type="hidden" name="variantId" value={variantId} />
      <Button type="submit" disabled={disabled}>
        Add to cart
      </Button>
    </form>
  );
}
