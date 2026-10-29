"use client";

import { useActionState } from "react";
import { Button } from "@repo/ui";
import { createStoreForUser, renameStore, type AdminFormState } from "@/features/admin/actions";

const initialState: AdminFormState = {};

const inputClass =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-400";

const inlineInputClass =
  "w-40 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-400";

export function CreateStoreForm() {
  const [state, formAction, pending] = useActionState(createStoreForUser, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label htmlFor="store-name" className="text-sm font-medium text-neutral-900">
            Store name
          </label>
          <input
            id="store-name"
            name="name"
            type="text"
            required
            minLength={2}
            className={inputClass}
          />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label htmlFor="store-email" className="text-sm font-medium text-neutral-900">
            Owner email
          </label>
          <input id="store-email" name="email" type="email" required className={inputClass} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create store"}
        </Button>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {state.error}
        </p>
      ) : null}

      {state.ok ? <p className="text-sm text-neutral-600">Store created.</p> : null}
    </form>
  );
}

export function RenameStoreForm({ id, name }: { id: string; name: string }) {
  const [state, formAction, pending] = useActionState(renameStore, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input type="hidden" name="id" value={id} />
        <label htmlFor={"store-name-" + id} className="sr-only">
          Store name
        </label>
        <input
          id={"store-name-" + id}
          name="name"
          type="text"
          required
          minLength={2}
          defaultValue={name}
          className={inlineInputClass}
        />
        <Button type="submit" variant="secondary" disabled={pending} className="px-2 py-1">
          {pending ? "Saving" : "Rename"}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="max-w-64 text-right text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
