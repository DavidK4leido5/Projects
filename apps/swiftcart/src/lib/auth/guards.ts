import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { profiles, stores, type Profile, type Role, type Store } from "@/lib/db/schema";
import { getAuthUser } from "@/lib/auth/session";

export type Actor =
  | { kind: "anonymous" }
  | { kind: "user"; profile: Profile }
  | { kind: "store"; profile: Profile; store: Store }
  | { kind: "admin"; profile: Profile };

/** The only place a role is decided. Everything else calls this. */
export async function getActor(): Promise<Actor> {
  const authUser = await getAuthUser();
  if (!authUser) return { kind: "anonymous" };

  const rows = await getDb().select().from(profiles).where(eq(profiles.id, authUser.id)).limit(1);
  const profile = rows[0];
  if (!profile) return { kind: "anonymous" };

  if (profile.role === "admin") return { kind: "admin", profile };
  if (profile.role === "store") {
    const owned = await getDb()
      .select()
      .from(stores)
      .where(eq(stores.ownerId, profile.id))
      .limit(1);
    const store = owned[0];
    if (store) return { kind: "store", profile, store };
  }
  return { kind: "user", profile };
}

export async function requireSignedIn(): Promise<Profile> {
  const actor = await getActor();
  if (actor.kind === "anonymous") redirect("/login");
  return actor.profile;
}

export async function requireAdmin(): Promise<Actor & { kind: "admin" }> {
  const actor = await getActor();
  if (actor.kind === "anonymous") redirect("/login");
  if (actor.kind !== "admin") redirect("/");
  return actor;
}

export async function requireStoreOwner(): Promise<Actor & { kind: "store" }> {
  const actor = await getActor();
  if (actor.kind === "anonymous") redirect("/login");
  if (actor.kind !== "store") redirect("/");
  return actor;
}

export async function requireUser(): Promise<Actor & { kind: "user" }> {
  const actor = await getActor();
  if (actor.kind === "anonymous") redirect("/login");
  if (actor.kind !== "user") redirect("/");
  return actor;
}

export function roleOf(actor: Actor): Role | null {
  return actor.kind === "anonymous" ? null : (actor.profile.role as Role);
}
