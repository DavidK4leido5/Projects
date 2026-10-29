import { Suspense } from "react";
import { UsersTable } from "@/components/admin/users-table";
import { PageSkeleton } from "@/components/skeletons";
import {
  isUserRoleFilter,
  listAdminUsers,
  USER_ROLES,
  type UserRoleFilter,
} from "@/app/admin/user-queries";
import { requireAdmin } from "@/lib/auth/guards";

type PageProps = {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
};

async function AdminUsersPageBody({ searchParams }: PageProps) {
  const actor = await requireAdmin();

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const rawRole = params.role ?? "all";
  const role: UserRoleFilter = isUserRoleFilter(rawRole) ? rawRole : "all";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const users = await listAdminUsers({ q, role, page });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight">Users</h2>
        <p className="text-sm text-muted-foreground">
          Every account on the marketplace, newest first. Changing a role away from store deletes
          that account&apos;s store; deleting an account removes its profile, store, and cart items.
        </p>
      </div>

      <UsersTable
        users={users.users}
        total={users.total}
        page={users.page}
        pages={users.pages}
        currentUserId={actor.profile.id}
        roles={USER_ROLES}
      />
    </div>
  );
}

export default function AdminUsersPage(props: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminUsersPageBody {...props} />
    </Suspense>
  );
}
