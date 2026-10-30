import { auth } from "@/lib/auth/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const handlers = auth.handler();

const LIMITED_PATHS = new Set(["/sign-in/email", "/sign-up/email", "/request-password-reset"]);

/**
 * Neon Auth rejects state-changing requests whose Origin is not its own host.
 * The proxy forwards the browser's origin as-is, so sign-in from a deployed
 * domain returns 403 INVALID_ORIGIN while localhost works. Forward same-origin
 * requests under the auth server's origin, which is what it trusts; anything
 * cross-site is passed through untouched and still refused upstream.
 */
function forward(request: Request): Request {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD") return request;

  const base = process.env.NEON_AUTH_BASE_URL;
  if (!base) return request;

  const origin = request.headers.get("origin");
  if (!origin) return request;

  const host = request.headers.get("host");
  const own = host ? new URL(request.url).protocol + "//" + host : new URL(request.url).origin;
  if (origin !== own) return request;

  const headers = new Headers(request.headers);
  headers.set("origin", new URL(base).origin);

  return new Request(request.url, {
    method: request.method,
    headers,
    body: request.body,
    duplex: "half",
  } as RequestInit);
}

type Context = { params: Promise<{ path: string[] }> };

function guarded(handler: (request: Request, context: Context) => Promise<Response>) {
  return async (request: Request, context: Context) => {
    const path = "/" + ((await context.params).path ?? []).join("/");

    if (request.method === "POST" && LIMITED_PATHS.has(path)) {
      const result = rateLimit("auth:" + clientIp(request), 10, 5 * 60 * 1000);
      if (!result.ok) {
        return Response.json(
          { message: "Too many attempts. Try again in " + result.retryAfter + " seconds." },
          { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
        );
      }
    }

    return handler(forward(request), context);
  };
}

export const GET = guarded(handlers.GET);
export const POST = guarded(handlers.POST);
export const PUT = guarded(handlers.PUT);
export const DELETE = guarded(handlers.DELETE);
export const PATCH = guarded(handlers.PATCH);
