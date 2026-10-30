import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

/** Liveness plus a real database round trip. No user data is returned. */
export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true, database: "up" });
  } catch {
    return Response.json({ ok: false, database: "down" }, { status: 503 });
  }
}
