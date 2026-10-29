import { randomUUID } from "node:crypto";
import { getCurrentStore } from "@/lib/auth";
import { storage } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  const store = await getCurrentStore();
  if (!store) return Response.json({ error: "Not signed in." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Expected a file field." }, { status: 400 });
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) return Response.json({ error: "Unsupported image type." }, { status: 415 });
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Image must be under 5 MB." }, { status: 413 });
  }

  const key = `products/${store.id}/${randomUUID()}.${extension}`;
  await storage.put(key, new Uint8Array(await file.arrayBuffer()), file.type);

  return Response.json({ key, url: `/api/images/${key}` });
}
