import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { CLOUDINARY_FOLDER, cloudinaryConfigured } from "@/lib/cloudinary";
import { storage, storageConfigured } from "@/lib/storage";

type Check = { status: "ok" | "fail"; detail?: string };

async function checkDatabase(): Promise<Check> {
  try {
    await getDb().execute(sql`select 1`);
    return { status: "ok" };
  } catch (error) {
    return { status: "fail", detail: (error as Error).message };
  }
}

async function checkStorage(): Promise<Check> {
  if (!storageConfigured()) return { status: "fail", detail: "Storage env vars are missing." };

  const key = `health/${Date.now()}.txt`;
  const body = new TextEncoder().encode("swiftcart");
  try {
    await storage.put(key, body, "text/plain");
    const fetched = await storage.get(key);
    await storage.remove(key);
    const roundTripped = fetched?.body.length === body.length;
    return roundTripped
      ? { status: "ok" }
      : { status: "fail", detail: "Read back a different object." };
  } catch (error) {
    return { status: "fail", detail: (error as Error).message };
  }
}

export async function GET() {
  const [database, storageCheck] = await Promise.all([checkDatabase(), checkStorage()]);
  const cdn = {
    status: cloudinaryConfigured() ? ("ok" as const) : ("unconfigured" as const),
    detail: cloudinaryConfigured()
      ? "folder " + CLOUDINARY_FOLDER
      : "CLOUDINARY_* env vars are missing",
  };
  const ok = database.status === "ok" && storageCheck.status === "ok";

  return Response.json(
    { ok, checks: { database, storage: storageCheck, cloudinary: cdn } },
    { status: ok ? 200 : 503 },
  );
}
