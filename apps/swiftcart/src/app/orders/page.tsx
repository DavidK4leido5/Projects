import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/guards";
import { PageSkeleton } from "@/components/skeletons";

export const metadata = { title: "Orders" };

/** Kept as an entry point: the list lives at /track now. */
async function OrdersRedirectBody() {
  const actor = await getActor();
  if (actor.kind === "anonymous") redirect("/login");
  redirect("/track");
  return null;
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrdersRedirectBody />
    </Suspense>
  );
}
