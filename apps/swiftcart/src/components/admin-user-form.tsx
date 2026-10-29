"use client";

import { useActionState } from "react";
import { Button } from "@repo/ui";
import { deleteUser, setUserRole, type AdminFormState } from "@/features/admin/actions";

const initialState: AdminFormState = {};

const selectClass =
  "rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-400";

export function RoleForm({ userId, role }: { userId: string; role: string }) {
  const [state, formAction, pending] = useActionState(setUserRole, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input type="hidden" name="userId" value={userId} />
        <label htmlFor={"role-" + userId} className="sr-only">
          Role
        </label>
        <select id={"role-" + userId} name="role" defaultValue={role} className={selectClass}>
          <option value="user">user</option>
          <option value="store">store</option>
          <option value="admin">admin</option>
        </select>
        <Button type="submit" variant="secondary" disabled={pending} className="px-2 py-1">
          {pending ? "Saving" : "Update"}
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

export function DeleteUserForm({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(deleteUser, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="ghost" disabled={pending} className="px-2 py-1">
        {pending ? "Deleting..." : "Delete"}
      </Button>
      {state.error ? (
        <p role="alert" className="max-w-56 text-right text-xs text-red-700">
          {state.error}
        </p>
      ) : null}
      {state.warning ? (
        <p className="max-w-56 text-right text-xs text-amber-700">{state.warning}</p>
      ) : null}
    </form>
  );
}
