import { Suspense } from "react";
import { Card, CardTitle } from "@repo/ui";
import { adminOverview } from "@/features/admin/queries";
import { PageSkeleton } from "@/components/skeletons";

async function AdminPageBody() {
  const overview = await adminOverview();
  const stats = [
    { label: "Users", value: overview.users },
    { label: "Stores", value: overview.stores },
    { label: "Products", value: overview.products },
    { label: "Cart items", value: overview.cartItems },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="flex flex-col gap-1">
            <CardTitle className="text-sm font-medium text-neutral-600">{stat.label}</CardTitle>
            <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-2">
        <CardTitle>What this area does</CardTitle>
        <p className="text-sm leading-6 text-neutral-600">
          This is the operator console for SwiftCart. It lists every account, store, and product in
          the marketplace. From here you can create a store for an existing account, rename or
          delete a store, change a user role, remove a user, and delete any product. Changes take
          effect immediately for every visitor.
        </p>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminPageBody />
    </Suspense>
  );
}
