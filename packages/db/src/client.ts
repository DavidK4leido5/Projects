import { Pool, neon, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export type HttpDatabase = NeonHttpDatabase<typeof schema>;
export type PoolDatabase = NeonDatabase<typeof schema>;

/**
 * Neon gives two URLs: the pooled one for application traffic and the direct
 * one for migrations. The app prefers the pooled URL, falls back to the direct
 * one for local scripts.
 */
export function databaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Run: neon env pull");
  }
  return url;
}

let httpClient: HttpDatabase | undefined;

/**
 * Fetch-based client for single queries. Lazy so a build never opens a
 * connection, and cheap to call from route handlers and server components.
 */
export function getDb(): HttpDatabase {
  httpClient ??= drizzle({ client: neon(databaseUrl()), schema });
  return httpClient;
}

let poolClient: PoolDatabase | undefined;

/**
 * WebSocket pool for work that needs a real transaction: transfers, CSV
 * imports, goal contributions, and any multi-row write.
 */
export function getDbPool(): PoolDatabase {
  if (!poolClient) {
    neonConfig.webSocketConstructor = WebSocket;
    const pool = new Pool({ connectionString: databaseUrl() });
    poolClient = drizzlePool({ client: pool, schema });
  }
  return poolClient;
}
