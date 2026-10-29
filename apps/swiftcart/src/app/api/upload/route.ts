import { randomUUID } from "node:crypto";
import { getAuthUser } from "@/lib/auth/session";
import { saveImage } from "@/lib/media";
import { cloudinaryConfigured } from "@/lib/cloudinary";

const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return Response.json({ error: "Not signed in." }, { status: 401 });

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

  const key = `products/${user.id}/${randomUUID()}.${extension}`;

  try {
    const saved = await saveImage(key, new Uint8Array(await file.arrayBuffer()), file.type);
    return Response.json({
      key: saved.key,
      url: `/api/images/${saved.key}`,
      cdn: saved.publicId ? { publicId: saved.publicId } : null,
      deliveredBy: saved.publicId ? "cloudinary" : "object-storage",
      cloudinaryConfigured: cloudinaryConfigured(),
    });
  } catch (error) {
    // Both stores or neither: the bucket copy is already gone at this point.
    return Response.json(
      {
        error:
          "The image was not saved anywhere. Cloudinary rejected it, so the bucket copy was removed.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
