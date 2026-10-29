import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { getDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

type Database = NeonHttpDatabase<typeof schema>;

let client: Database | undefined;

/**
 * Lazily created so `next build` never needs a live database.
 * The HTTP driver talks to Neon over fetch, so there is no pool to manage.
 */
export function getDb(): Database {
  if (client) return client;

  const url = getDatabaseUrl();
  if (!url) {
    throw new Error(
      "No database URL. Set DATABASE_URL (or PGHOST, PGUSER, PGPASSWORD, PGDATABASE).",
    );
  }

  client = drizzle({ client: neon(url), schema });
  return client;
}
