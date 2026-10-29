"use client";

import { Fragment, useEffect, useOptimistic, useState, useTransition, useActionState } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Card,
  Input,
} from "@repo/ui";
import { deleteStore, renameStore, type AdminFormState } from "@/features/admin/actions";

export type StoreRow = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  productCount: number;
};

type StoreStats = { orders: number; openSlices: number };

const initialState: AdminFormState = {};

function RenameRow({ store, onDone }: { store: StoreRow; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(renameStore, initialState);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={store.id} />
      <label htmlFor={"rename-" + store.id} className="sr-only">
        Store name
      </label>
      <Input
        id={"rename-" + store.id}
        name="name"
        type="text"
        required
        minLength={2}
        defaultValue={store.name}
        autoFocus
        className="w-full sm:w-64"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={pending}>
        Cancel
      </Button>
      {state.error ? (
        <p role="alert" className="w-full text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function StoresTable({
  stores,
  orderStats,
}: {
  stores: StoreRow[];
  orderStats: Record<string, StoreStats>;
}) {
  const [rows, removeRow] = useOptimistic(stores, (state, id: string) =>
    state.filter((store) => store.id !== id),
  );
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);

  function remove(id: string) {
    startTransition(async () => {
      removeRow(id);
      const data = new FormData();
      data.set("id", id);
      await deleteStore(data);
    });
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">
              Store
            </th>
            <th scope="col" className="px-5 py-3 font-medium">
              Owner
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Products
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Orders
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Open slices
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {rows.map((store) => {
            const activity = orderStats[store.id];
            const isEditing = editing === store.id;

            return (
              <Fragment key={store.id}>
                <tr className="transition-colors hover:bg-neutral-50">
                  <td className="px-5 py-2.5">
                    <Link
                      href={"/stores/" + store.slug}
                      className="font-medium text-neutral-900 underline-offset-4 hover:underline"
                    >
                      {store.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-neutral-600">{store.ownerEmail}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-neutral-600">
                    {store.productCount}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-neutral-600">
                    {activity?.orders ?? 0}
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-neutral-600">
                    {activity?.openSlices ?? 0}
                  </td>
                  <td className="px-5 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-600 hover:text-neutral-900"
                        aria-label={"Rename " + store.name}
                        title="Rename store"
                        onClick={() => setEditing(isEditing ? null : store.id)}
                      >
                        <Pencil />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-neutral-500 hover:text-destructive"
                            aria-label={"Delete " + store.name}
                            title="Delete store"
                          >
                            <Trash2 />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {store.name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This removes the store and every product listed in it, and returns the
                              owner to the user role. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => remove(store.id)}
                            >
                              Delete store
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>

                {isEditing ? (
                  <tr className="bg-neutral-50">
                    <td colSpan={6} className="px-5 py-3">
                      <RenameRow store={store} onDone={() => setEditing(null)} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
