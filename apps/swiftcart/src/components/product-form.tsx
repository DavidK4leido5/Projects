"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Card } from "@repo/ui";
import { emptyFormState, type FormState } from "@/lib/form";
import { ImageUpload } from "@/components/image-upload";

type ProductFormProps = {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  product?: {
    id: string;
    name: string;
    description: string;
    priceCents: number;
    imageKey: string | null;
  };
};

const inputClass =
  "rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-400";

export function ProductForm({ action, product }: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  return (
    <Card>
      <form action={formAction} className="flex flex-col gap-5">
        {product ? <input type="hidden" name="id" value={product.id} /> : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-neutral-900">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            defaultValue={product?.name}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="price" className="text-sm font-medium text-neutral-900">
            Price
          </label>
          <input
            id="price"
            name="price"
            type="number"
            step="0.01"
            min="0"
            defaultValue={product ? (product.priceCents / 100).toFixed(2) : undefined}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm font-medium text-neutral-900">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={product?.description}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-neutral-900">Image</span>
          <ImageUpload initialKey={product?.imageKey ?? null} />
        </div>

        {state.error ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {state.error}
          </p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {product ? "Save changes" : "Create product"}
          </Button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  );
}
