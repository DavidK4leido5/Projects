import { getDatabaseUrl, getStorageConfig } from "../src/lib/env";

const db = getDatabaseUrl();
const storage = getStorageConfig();

function mask(value: string | undefined): string {
  if (!value) return "missing";
  if (value.length <= 12) return "set";
  return `set (${value.slice(0, 6)}...${value.slice(-4)})`;
}

console.log("database :", mask(db));
if (db) {
  try {
    const parsed = new URL(db);
    console.log("  host   :", parsed.host);
    console.log("  database:", parsed.pathname.replace(/^\//, ""));
  } catch {
    console.log("  host   : could not parse the URL");
  }
}

console.log("storage  :", storage ? "configured" : "missing");
if (storage) {
  console.log("  endpoint:", storage.endpoint);
  console.log("  bucket  :", storage.bucket);
  console.log("  region  :", storage.region);
}

const relevant = Object.keys(process.env)
  .filter((name) => /NEON|DATABASE|POSTGRES|PG|OBJECT|AWS|S3|STORAGE|BUCKET/i.test(name))
  .sort();

console.log("\nenv names visible to the app:");
if (relevant.length === 0) console.log("  none");
for (const name of relevant) console.log("  " + name);
