import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getActor } from "@/lib/auth/guards";

/** Single place that maps a role to its landing page. */
export default function ContinuePage() {
  return (
    <Suspense fallback={null}>
      <Redirector />
    </Suspense>
  );
}

async function Redirector() {
  const actor = await getActor();

  if (actor.kind === "admin") redirect("/admin");
  if (actor.kind === "store") redirect("/dashboard");
  if (actor.kind === "user") redirect("/");

  redirect("/login");
  return null;
}
