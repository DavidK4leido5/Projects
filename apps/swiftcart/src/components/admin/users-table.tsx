"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import { Eye, ShieldCheck, Store, Trash2, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
} from "@repo/ui";
import type { AdminUser } from "@/app/admin/user-queries";
import { RoleBadge, UserDrawer } from "@/components/admin/user-drawer";
import { Pagination } from "@/components/pagination";
import { ResultsRegion } from "@/components/results-region";
import { RowMenu, type RowMenuItem } from "@/components/row-menu";
import { TableSkeleton } from "@/components/table-skeleton";
import { TableToolbar } from "@/components/table-toolbar";
import { changeUserRole, removeUserAccount } from "@/features/admin/actions";
import { beginPending, useSettlePending } from "@/lib/navigation-pending";
import type { Role } from "@/lib/db/schema";

const USERS_PATH = "/admin/users";

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const ROLE_ICONS: Record<Role, ReactNode> = {
  user: <User />,
  store: <Store />,
  admin: <ShieldCheck />,
};

export type UsersTableProps = {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
  currentUserId: string;
  roles: readonly Role[];
};

type UserAction = { type: "role"; id: string; role: Role } | { type: "remove"; id: string };

function reduceUsers(users: AdminUser[], action: UserAction): AdminUser[] {
  if (action.type === "remove") return users.filter((user) => user.id !== action.id);
  return users.map((user) =>
    user.id === action.id
      ? { ...user, role: action.role, store: action.role === "store" ? user.store : null }
      : user,
  );
}

/** Serialises the view state; defaults stay out of the URL. */
function usersHref({ q, role, page }: { q: string; role: string; page: number }): string {
  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (role !== "all") search.set("role", role);
  if (page > 1) search.set("page", String(page));
  const query = search.toString();
  return query ? USERS_PATH + "?" + query : USERS_PATH;
}

export function UsersTable({
  users: serverUsers,
  total,
  page,
  pages,
  currentUserId,
  roles,
}: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The URL landing is the end signal for every toolbar navigation.
  const paramsKey = searchParams.toString();
  useSettlePending(paramsKey);
  const [pending, startTransition] = useTransition();

  const rawRole = searchParams.get("role") ?? "all";
  const role = roles.some((value) => value === rawRole) ? rawRole : "all";
  const q = searchParams.get("q") ?? "";

  // The row changes under the cursor first; the server confirms in the background.
  const [users, applyOptimistic] = useOptimistic(serverUsers, reduceUsers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = users.find((user) => user.id === selectedId) ?? null;

  function write(href: string, replace: boolean) {
    startTransition(() => {
      beginPending();
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  }

  function search(value: string) {
    write(usersHref({ q: value, role, page: 1 }), true);
  }

  function filter(next: string) {
    write(usersHref({ q, role: next, page: 1 }), false);
  }

  function clearFilters() {
    write(USERS_PATH, false);
  }

  function openUser(user: AdminUser) {
    setError(null);
    setNotice(null);
    setSelectedId(user.id);
  }

  function saveRole(user: AdminUser, next: Role) {
    if (next === user.role) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      applyOptimistic({ type: "role", id: user.id, role: next });
      const result = await changeUserRole(user.id, next);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function remove(user: AdminUser) {
    setError(null);
    setNotice(null);
    setSelectedId(null);
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: user.id });
      const result = await removeUserAccount(user.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.warning) setNotice(result.warning);
      router.refresh();
    });
  }

  const filtered = q.length > 0 || role !== "all";

  return (
    <div className="flex flex-col gap-3">
      <TableToolbar
        value={q}
        onSearch={search}
        placeholder="Search name or email"
        filters={
          <select
            value={role}
            onChange={(event) => filter(event.target.value)}
            aria-label="Filter by role"
            className={SELECT_CLASS}
          >
            <option value="all">All roles</option>
            {roles.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        }
        count={total}
        countLabel={total === 1 ? "user" : "users"}
      />

      {error && !selected && !confirm ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {notice && !selected && !confirm ? <p className="text-sm text-amber-700">{notice}</p> : null}

      <ResultsRegion
        id="admin-users-results"
        skeleton={<TableSkeleton rows={Math.max(users.length, 1)} columns={5} />}
      >
        {users.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 px-5 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {filtered ? "No users match this view." : "No users yet."}
            </p>
            {filtered ? (
              <Button type="button" variant="link" size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null}
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Email
                    </th>
                    <th scope="col" className="w-24 px-4 py-2.5 font-medium">
                      Role
                    </th>
                    <th scope="col" className="w-32 px-4 py-2.5 font-medium">
                      Created
                    </th>
                    <th scope="col" className="w-12 px-4 py-2.5 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const roleItems: RowMenuItem[] = roles
                      .filter((value) => value !== user.role)
                      .map((value, index) => ({
                        label: "Change role to " + value,
                        icon: ROLE_ICONS[value],
                        separatorBefore: index === 0,
                        disabled: isSelf,
                        onSelect: () => saveRole(user, value),
                      }));

                    return (
                      <tr
                        key={user.id}
                        tabIndex={0}
                        onClick={() => openUser(user)}
                        onKeyDown={(event) => {
                          if (event.target !== event.currentTarget) return;
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          openUser(user);
                        }}
                        className="cursor-pointer transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                      >
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2 font-medium text-foreground">
                            {user.name}
                            {isSelf ? <Badge variant="secondary">you</Badge> : null}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                        <td className="px-4 py-3">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {user.joined}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end">
                            <RowMenu
                              label={"Actions for " + user.name}
                              items={[
                                {
                                  label: "View details",
                                  icon: <Eye />,
                                  onSelect: () => openUser(user),
                                },
                                ...roleItems,
                                {
                                  label: "Delete account",
                                  icon: <Trash2 />,
                                  destructive: true,
                                  separatorBefore: true,
                                  disabled: isSelf,
                                  onSelect: () => {
                                    setError(null);
                                    setNotice(null);
                                    setConfirm(user);
                                  },
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </ResultsRegion>

      <Pagination page={page} pages={pages} scrollTargetId="admin-users-results" />

      <UserDrawer
        user={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        currentUserId={currentUserId}
        roles={roles}
        pending={pending}
        error={selected ? error : null}
        onSaveRole={(next) => {
          if (selected) saveRole(selected, next);
        }}
        onDelete={() => {
          if (selected) setConfirm(selected);
        }}
      />

      <DeleteUserDialog
        user={confirm}
        pending={pending}
        onClose={() => {
          setConfirm(null);
          setError(null);
        }}
        onConfirm={remove}
      />
    </div>
  );
}

function DeleteUserDialog({
  user,
  pending,
  onClose,
  onConfirm,
}: {
  user: AdminUser | null;
  pending: boolean;
  onClose: () => void;
  onConfirm: (user: AdminUser) => void;
}) {
  return (
    <AlertDialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <AlertDialogContent>
        {user ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {user.name}&apos;s account?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the profile, its store and products, and its cart items. Orders stay,
                but they lose the customer link. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Keep account</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={pending}
                onClick={() => onConfirm(user)}
              >
                {pending ? "Deleting..." : "Delete account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
