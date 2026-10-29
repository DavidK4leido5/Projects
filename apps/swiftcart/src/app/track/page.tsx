import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardTitle } from "@repo/ui";
import { TrackList } from "@/components/track-list";
import { PageSkeleton } from "@/components/skeletons";
import { listTracking } from "@/features/orders/tracking";
import { getActor } from "@/lib/auth/guards";

export const metadata = { title: "Tracking" };

const BLURBS = {
  user: "Everything you have ordered, newest first.",
  store: "Orders with a part that belongs to your store.",
  admin: "Every order on the marketplace, newest first.",
  anonymous: "",
} as const;

async function TrackPageBody() {
  const actor = await getActor();
  if (actor.kind === "anonymous") redirect("/login");
  const rows = await listTracking(actor);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-2 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Order tracking</h1>
        <p className="text-sm text-muted-foreground">{BLURBS[actor.kind]}</p>
      </div>

      {rows.length === 0 ? (
        <Card className="mt-8 flex flex-col items-start gap-3 p-5">
          <CardTitle>No orders to track yet</CardTitle>
          <p className="text-sm text-muted-foreground">
            {actor.kind === "store"
              ? "Orders that include one of your products will show up here."
              : "Once an order is placed it will be listed here with its progress."}
          </p>
          {actor.kind === "user" ? (
            <Link href="/" className="text-sm font-medium underline-offset-4 hover:underline">
              Browse the shop
            </Link>
          ) : null}
        </Card>
      ) : (
        <TrackList rows={rows} />
      )}
    </main>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TrackPageBody />
    </Suspense>
  );
}
