"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { Badge, Button } from "@repo/ui";
import type { AdminUser, AdminUserAddress } from "@/app/admin/user-queries";
import { EntityDrawer } from "@/components/entity-drawer";
import type { Role } from "@/lib/db/schema";

const SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const ROLE_STYLES: Record<Role, string> = {
  admin: "border-transparent bg-neutral-900 text-white",
  store: "border-transparent bg-neutral-100 text-neutral-900",
  user: "border-transparent bg-neutral-100 text-neutral-600",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge className={ROLE_STYLES[role]}>{role}</Badge>;
}

type UserDrawerProps = {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  roles: readonly Role[];
  pending: boolean;
  error: string | null;
  onSaveRole: (role: Role) => void;
  onDelete: () => void;
};

/** Drawer shell: identity, store, delivery address, orders, and role controls. */
export function UserDrawer({
  user,
  open,
  onOpenChange,
  currentUserId,
  roles,
  pending,
  error,
  onSaveRole,
  onDelete,
}: UserDrawerProps) {
  return (
    <EntityDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={user ? user.name : "User"}
      description={user ? user.email : undefined}
      footer={
        user ? (
          <UserFooter
            key={user.id}
            user={user}
            roles={roles}
            isSelf={user.id === currentUserId}
            pending={pending}
            error={error}
            onSaveRole={onSaveRole}
            onDelete={onDelete}
          />
        ) : null
      }
    >
      {user ? <UserDetail user={user} /> : null}
    </EntityDrawer>
  );
}

function UserDetail({ user }: { user: AdminUser }) {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <RoleBadge role={user.role} />
          <span className="text-xs text-muted-foreground">Joined {user.joined}</span>
        </div>
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Orders placed</span>
          <span className="font-medium tabular-nums">{user.orderCount}</span>
        </div>
      </section>

      {user.store ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Store
          </h3>
          <Link
            href={"/stores/" + user.store.slug}
            className="flex items-center justify-between gap-3 rounded-lg border border-border p-4 transition-colors hover:border-foreground/20 hover:bg-muted/40"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-medium">{user.store.name}</span>
              <span className="truncate text-xs text-muted-foreground">
                /stores/{user.store.slug}
              </span>
              <span className="text-xs text-muted-foreground">
                {user.store.productCount} {user.store.productCount === 1 ? "product" : "products"}
              </span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      {user.address ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Delivery address
          </h3>
          <address className="rounded-lg border border-border p-4 text-sm not-italic">
            <span className="block font-medium">{user.address.fullName}</span>
            <span className="block text-muted-foreground">{user.address.phone}</span>
            {addressLines(user.address).map((line) => (
              <span key={line} className="mt-0.5 block text-muted-foreground">
                {line}
              </span>
            ))}
          </address>
        </section>
      ) : null}

      {!user.store && !user.address ? (
        <p className="text-sm text-muted-foreground">
          No store and no saved delivery address on this account.
        </p>
      ) : null}
    </div>
  );
}

function addressLines(address: AdminUserAddress): string[] {
  return [
    [address.line1, address.line2].filter(Boolean).join(", "),
    [address.city, address.region].filter(Boolean).join(", "),
    [address.postal, address.country].filter(Boolean).join(" "),
  ].filter((line) => line.length > 0);
}

function UserFooter({
  user,
  roles,
  isSelf,
  pending,
  error,
  onSaveRole,
  onDelete,
}: {
  user: AdminUser;
  roles: readonly Role[];
  isSelf: boolean;
  pending: boolean;
  error: string | null;
  onSaveRole: (role: Role) => void;
  onDelete: () => void;
}) {
  const [role, setRole] = useState<Role>(user.role);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="px-2 text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={pending || isSelf}
        >
          <Trash2 aria-hidden="true" />
          Delete account
        </Button>

        <div className="flex items-center gap-2">
          <label htmlFor="user-drawer-role" className="text-sm text-muted-foreground">
            Role
          </label>
          <select
            id="user-drawer-role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
            disabled={pending || isSelf}
            className={SELECT_CLASS}
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            onClick={() => onSaveRole(role)}
            disabled={pending || isSelf || role === user.role}
          >
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {isSelf ? (
        <p className="text-xs text-muted-foreground">
          This is your own account. Another admin has to change its role or delete it.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
