import Link from "next/link";
import { formatDate } from "@repo/shared";
import { Card } from "@repo/ui";
import { DeleteUserForm, RoleForm } from "@/components/admin-user-form";
import { listProfiles } from "@/features/admin/queries";
import { requireAdmin } from "@/lib/auth/guards";

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-neutral-900 text-white",
  store: "bg-neutral-100 text-neutral-900",
  user: "bg-neutral-100 text-neutral-600",
};

export default async function AdminUsersPage() {
  const actor = await requireAdmin();
  const profiles = await listProfiles();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight">Users</h2>
        <p className="text-sm text-neutral-600">
          Changing a role away from store deletes that account&apos;s store. Deleting an account
          removes its profile, store, and cart items.
        </p>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">No users yet.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Email
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Role
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Store
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Created
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {profiles.map((profile) => {
                const isSelf = profile.id === actor.profile.id;

                return (
                  <tr key={profile.id}>
                    <td className="px-5 py-3 font-medium text-neutral-900">
                      <span className="flex items-center gap-2">
                        {profile.name}
                        {isSelf ? (
                          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                            you
                          </span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-neutral-600">{profile.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs font-medium " +
                          (ROLE_STYLES[profile.role] ?? ROLE_STYLES.user)
                        }
                      >
                        {profile.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {profile.storeSlug ? (
                        <Link
                          href={"/stores/" + profile.storeSlug}
                          className="text-neutral-600 underline-offset-4 hover:underline"
                        >
                          /stores/{profile.storeSlug}
                        </Link>
                      ) : (
                        <span className="text-neutral-400">None</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">{formatDate(profile.createdAt)}</td>
                    <td className="px-5 py-3">
                      {isSelf ? (
                        <span className="block text-right text-xs text-neutral-500">
                          Your account
                        </span>
                      ) : (
                        <div className="flex items-start justify-end gap-2">
                          <RoleForm userId={profile.id} role={profile.role} />
                          <DeleteUserForm userId={profile.id} />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
