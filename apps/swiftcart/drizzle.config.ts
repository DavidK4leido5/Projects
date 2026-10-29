import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  // Neon Auth owns its own schema in the same database. Without this filter the
  // generator stops to ask which schema a table name belongs to.
  schemaFilter: ["public"],
});
