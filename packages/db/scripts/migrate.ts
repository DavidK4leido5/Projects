import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("Missing DATABASE_URL_UNPOOLED (or DATABASE_URL). Run: neon env pull");
  process.exit(1);
}

const folder = resolve(import.meta.dirname, "../drizzle");
if (!existsSync(folder)) {
  console.error("No migrations found in " + folder + ". Run: pnpm --filter @repo/db db:generate");
  process.exit(1);
}

const db = drizzle({ client: neon(url) });

await migrate(db, {
  migrationsFolder: folder,
  migrationsSchema: "drizzle",
  migrationsTable: "__drizzle_migrations_spendwise",
});

console.log("Migrations applied from " + folder);
