import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth/guards";

/** Single place that maps a role to its landing page. */
export default async function ContinuePage() {
  const actor = await getActor();

  if (actor.kind === "admin") redirect("/admin");
  if (actor.kind === "store") redirect("/dashboard");
  if (actor.kind === "user") redirect("/");
  redirect("/login");
}
