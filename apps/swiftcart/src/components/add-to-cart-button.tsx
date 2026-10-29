import { Button } from "@repo/ui";
import { addToCart } from "@/features/cart/actions";

type AddToCartButtonProps = {
  productId: string;
  className?: string;
};

export function AddToCartButton({ productId, className }: AddToCartButtonProps) {
  return (
    <form action={addToCart} className={className}>
      <input type="hidden" name="productId" value={productId} />
      <Button type="submit">Add to cart</Button>
    </form>
  );
}
