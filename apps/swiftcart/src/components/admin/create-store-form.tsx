"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@repo/ui";
import { createStoreForUser, type AdminFormState } from "@/features/admin/actions";

const initialState: AdminFormState = {};

export function CreateStoreForm() {
  const [state, formAction, pending] = useActionState(createStoreForUser, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Label htmlFor="store-name" className="sm:col-start-1 sm:row-start-1">
          Store name
        </Label>
        <Input
          id="store-name"
          name="name"
          type="text"
          required
          minLength={2}
          aria-describedby="store-name-help"
          className="sm:col-start-1 sm:row-start-2"
        />
        <p
          id="store-name-help"
          className="text-xs leading-4 text-neutral-500 sm:col-start-1 sm:row-start-3"
        >
          At least 2 characters.
        </p>

        <Label htmlFor="owner-email" className="mt-3 sm:col-start-2 sm:row-start-1 sm:mt-0">
          Owner email
        </Label>
        <Input
          id="owner-email"
          name="email"
          type="email"
          required
          aria-describedby="owner-email-help"
          className="sm:col-start-2 sm:row-start-2"
        />
        <p
          id="owner-email-help"
          className="text-xs leading-4 text-neutral-500 sm:col-start-2 sm:row-start-3"
        >
          They must already have signed up.
        </p>

        <Button
          type="submit"
          disabled={pending}
          className="mt-1 w-full sm:col-start-3 sm:row-start-2 sm:mt-0 sm:w-auto sm:self-end"
        >
          {pending ? "Creating..." : "Create store"}
        </Button>
      </div>

      <p className="min-h-10 text-sm sm:min-h-5" aria-live="polite">
        {state.error ? <span className="text-red-700">{state.error}</span> : null}
        {!state.error && state.ok ? <span className="text-neutral-600">Store created.</span> : null}
      </p>
    </form>
  );
}
