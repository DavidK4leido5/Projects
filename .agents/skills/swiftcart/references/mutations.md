# Mutations

## Action shape

```ts
"use server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateThing(formData: FormData): Promise<ActionResult> {
  const actor = await requireStoreOwner();
  const parsed = parse(formData);
  if ("error" in parsed) return { ok: false, error: parsed.error };

  await getDb().update(things).set(parsed).where(eq(things.id, id));
  updateTag(tags.products);
  return { ok: true };
}
```

- No redirects. The one exception is navigation that is the point of the call (sign-in, receipt link).
- Validate server-side. Ownership in the WHERE clause, never a route check alone.
- Orders return `{ ok: true, token, ref }` so the client can render the success panel in place.

## Optimistic client

```tsx
const [rows, apply] = useOptimistic(serverRows, reducer);
const [pending, start] = useTransition();

function remove(row: Row) {
  start(async () => {
    apply({ type: "delete", id: row.id });
    const result = await deleteThing(row.id);
    if (!result.ok) setError(result.error);
    router.refresh();
  });
}
```

The optimistic value is discarded when the transition ends, so a failed action reverts on its own.
`router.refresh()` reconciles with the database; the server is the source of truth.

## State choices

- `useOptimistic` when the server row list is the base and the change is temporary.
- Local `useState` only for things the server does not own (open drawer, draft text, confirm dialog).
- Never mirror server data into state and sync it with an effect. Pass props down.

## Delete confirmation

Radix `AlertDialog` unmounts before a form submit lands. Delete from `onClick`, inside the transition,
then `router.refresh()`.

## Forms

- `ProductForm` takes `onSubmit(FormData)`; the manager owns the optimistic row and the action call.
- `useActionState` is fine for dialogs where the result is shown in place (rename store), but the
  success callback belongs in the action wrapper, not an effect.

## Bulk import

`POST /api/admin/products` accepts `{ storeSlug?, products: [...] }`, imports images through
`saveImage`, inserts products/variants, and returns `{ created, failed }`. Session must be store or admin.
