import { Client, neonConfig } from "@neondatabase/serverless";
import { getAuthUser } from "@/lib/auth/session";

neonConfig.webSocketConstructor = WebSocket;

export const maxDuration = 60;

type NotificationPayload = {
  id: string;
  userId: string;
};

/**
 * SSE bridge over Postgres LISTEN/NOTIFY. The direct Neon URL is required:
 * LISTEN is session-scoped and a pooled connection cannot keep it.
 *
 * Vercel closes the function at maxDuration. EventSource reconnects on its
 * own, which re-arms LISTEN for the next window.
 */
export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) return new Response("Database is not configured", { status: 500 });

  const encoder = new TextEncoder();
  let client: Client | undefined;
  let keepAlive: ReturnType<typeof setInterval> | undefined;
  let lifetime: ReturnType<typeof setTimeout> | undefined;
  let closed = false;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;

  function close() {
    if (closed) return;
    closed = true;
    if (keepAlive) clearInterval(keepAlive);
    if (lifetime) clearTimeout(lifetime);
    void client?.end().catch(() => undefined);
    try {
      controllerRef?.close();
    } catch {
      // already closed by the runtime
    }
  }

  function send(event: string, data: unknown) {
    if (closed || !controllerRef) return;
    try {
      controllerRef.enqueue(
        encoder.encode("event: " + event + "\ndata: " + JSON.stringify(data) + "\n\n"),
      );
    } catch {
      close();
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controllerRef = controller;
      request.signal.addEventListener("abort", close, { once: true });

      try {
        client = new Client({ connectionString });
        await client.connect();
        await client.query("listen spendwise_notifications");

        client.on("notification", (message) => {
          void (async () => {
            if (closed || !message.payload) return;

            let payload: NotificationPayload;
            try {
              payload = JSON.parse(message.payload) as NotificationPayload;
            } catch {
              return;
            }
            if (payload.userId !== user.id) return;

            const result = await client?.query(
              'select id, type, title, body, read_at as "readAt", metadata, created_at as "createdAt" from spendwise.notifications where id = $1 and user_id = $2 limit 1',
              [payload.id, user.id],
            );
            const row = result?.rows[0];
            if (row) send("notification", row);
          })().catch(close);
        });

        send("ready", { connected: true });
        keepAlive = setInterval(() => send("ping", { at: Date.now() }), 15_000);
        lifetime = setTimeout(close, 55_000);
      } catch {
        close();
      }
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
