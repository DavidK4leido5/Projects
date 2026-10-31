import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url },
  // Only Dalorro tables. Neon Auth lives in neon_auth and is left alone.
  schemaFilter: ["spendwise"],
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations_spendwise",
  },
  strict: true,
  verbose: true,
});
