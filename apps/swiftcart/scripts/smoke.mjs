/**
 * Post-deploy smoke check. Runs against a live server, no test framework.
 *   node scripts/smoke.mjs [baseUrl]
 */
const base = process.argv[2] ?? process.env.SMOKE_URL ?? "http://127.0.0.1:3000";

let failures = 0;

async function check(name, run) {
  try {
    const detail = await run();
    console.log(`ok    ${name}${detail ? ` (${detail})` : ""}`);
  } catch (error) {
    failures += 1;
    console.error(`FAIL  ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const health = await fetch(`${base}/api/health`).then((response) => response.json());

await check("postgres reachable", () => {
  assert(
    health.checks.database.status === "ok",
    health.checks.database.detail ?? "db check failed",
  );
  return "select 1";
});

await check("object storage roundtrip", () => {
  assert(
    health.checks.storage.status === "ok",
    health.checks.storage.detail ?? "storage check failed",
  );
  return "put, get, delete";
});

await check("storefront renders", async () => {
  const response = await fetch(base);
  const html = await response.text();
  assert(response.ok, `status ${response.status}`);
  assert(html.includes("SwiftCart"), "missing app shell");
  return `${response.status}, ${html.length} bytes`;
});

await check("seeded store page renders", async () => {
  const response = await fetch(`${base}/stores/northwind-supply`);
  const html = await response.text();
  assert(response.ok, `status ${response.status}`);
  assert(html.includes("Northwind Supply"), "store name missing from HTML");
  return "Northwind Supply";
});

await check("missing product returns 404", async () => {
  const response = await fetch(`${base}/products/this-does-not-exist`);
  assert(response.status === 404, `expected 404, got ${response.status}`);
  return "404";
});

await check("unauthenticated upload is rejected", async () => {
  const body = new FormData();
  body.set("file", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "a.png");
  const response = await fetch(`${base}/api/upload`, { method: "POST", body });
  assert(response.status === 401, `expected 401, got ${response.status}`);
  return "401";
});

console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
