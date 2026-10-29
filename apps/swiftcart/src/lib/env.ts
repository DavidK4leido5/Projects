/**
 * One place that knows what a Neon env var can be called.
 *
 * Neon hands out credentials under several names depending on how they were
 * provisioned (console snippets, `neon env pull`, Vercel integration, plain
 * S3 tooling). The app only cares about canonical values, so every alias is
 * resolved here instead of leaking into the db client or the storage adapter.
 */

function first(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

export function getDatabaseUrl(): string | undefined {
  const direct = first("DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "DATABASE_URL_POOLED");
  if (direct) return direct;

  // Neon console and Vercel both expose split PG* variables.
  const host = first("PGHOST", "POSTGRES_HOST");
  const user = first("PGUSER", "POSTGRES_USER");
  const password = first("PGPASSWORD", "POSTGRES_PASSWORD");
  const database = first("PGDATABASE", "POSTGRES_DATABASE");
  const port = first("PGPORT") ?? "5432";

  if (!host || !user || !password || !database) return undefined;

  const url = new URL(`postgresql://${host}:${port}/${database}`);
  url.username = user;
  url.password = password;
  url.searchParams.set("sslmode", "require");
  return url.toString();
}

/** Matches the bucket `neon init --services object-storage` writes into neon.ts. */
const DEFAULT_BUCKET = "assets";

export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export function getStorageConfig(): StorageConfig | null {
  // Neon emits the S3 SDK's standard names (see the CLI's ENV_KEY_SERVICE map).
  const endpoint = first(
    "AWS_ENDPOINT_URL_S3",
    "OBJECT_STORAGE_ENDPOINT",
    "AWS_ENDPOINT_URL",
    "S3_ENDPOINT",
    "NEON_STORAGE_ENDPOINT",
    "STORAGE_ENDPOINT",
  );
  // Neon never emits a bucket name: the bucket is declared in neon.ts, and the
  // CLI template calls it "assets". Overridable for other providers.
  const bucket =
    first(
      "OBJECT_STORAGE_BUCKET",
      "AWS_S3_BUCKET_NAME",
      "AWS_BUCKET_NAME",
      "S3_BUCKET",
      "NEON_STORAGE_BUCKET",
      "BUCKET_NAME",
    ) ?? DEFAULT_BUCKET;
  const accessKeyId = first(
    "AWS_ACCESS_KEY_ID",
    "OBJECT_STORAGE_ACCESS_KEY_ID",
    "S3_ACCESS_KEY_ID",
    "STORAGE_ACCESS_KEY_ID",
  );
  const secretAccessKey = first(
    "AWS_SECRET_ACCESS_KEY",
    "OBJECT_STORAGE_SECRET_ACCESS_KEY",
    "S3_SECRET_ACCESS_KEY",
    "STORAGE_SECRET_ACCESS_KEY",
  );
  const region =
    first(
      "AWS_REGION",
      "OBJECT_STORAGE_REGION",
      "AWS_DEFAULT_REGION",
      "S3_REGION",
      "STORAGE_REGION",
    ) ?? "auto";

  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return { endpoint, region, bucket, accessKeyId, secretAccessKey };
}
