import { storage } from "@/lib/storage";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const object = await storage.get(key.join("/"));
  if (!object) return new Response("Not found", { status: 404 });

  return new Response(object.body as BodyInit, {
    headers: {
      "Content-Type": object.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
