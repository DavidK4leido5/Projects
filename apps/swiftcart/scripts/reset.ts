import { neon } from "@neondatabase/serverless";

/**
 * Drops the app schema and the migration ledger so the next migrate starts from
 * zero. Demo project only: this deletes every row.
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const sql = neon(url);
  await sql`drop schema if exists public cascade`;
  await sql`create schema public`;
  await sql`drop schema if exists drizzle cascade`;

  console.log("schema reset");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
