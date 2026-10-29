import { auth } from "@/lib/auth/server";

const handlers = auth.handler();

/**
 * Neon Auth rejects every state-changing request whose `Origin` is not its own
 * host, and this proxy forwards the browser's origin as-is. So sign-in from any
 * deployed domain came back 403 INVALID_ORIGIN while localhost worked, because
 * only localhost was trusted.
 *
 * The proxy does that check itself instead: a request that is same-origin with
 * the site is forwarded under the auth server's origin, which is what the
 * server trusts, and a request from anywhere else is passed through untouched,
 * so the server still refuses it. Nothing cross-site gains access.
 */
function forward(request: Request): Request {
  const method = request.method.toUpperCase();
  // Reads carry no origin and are not origin-checked upstream.
  if (method === "GET" || method === "HEAD") return request;

  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) return request;

  const origin = request.headers.get("origin");
  if (!origin) return request;

  // Behind Vercel the request URL can carry the deployment host while the
  // browser asked for an alias, so compare against the Host header.
  const host = request.headers.get("host");
  const own = host ? new URL(request.url).protocol + "//" + host : new URL(request.url).origin;
  if (origin !== own) return request;

  const headers = new Headers(request.headers);
  headers.set("origin", new URL(base).origin);

  // `duplex` is required whenever a Request is rebuilt around a stream body.
  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
  } as RequestInit);
}

function proxied<C>(handler: (request: Request, context: C) => Promise<Response>) {
  return (request: Request, context: C) => handler(forward(request), context);
}

export const GET = proxied(handlers.GET);
export const POST = proxied(handlers.POST);
export const PUT = proxied(handlers.PUT);
export const DELETE = proxied(handlers.DELETE);
export const PATCH = proxied(handlers.PATCH);
