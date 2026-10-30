import "server-only";

import { createHash } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Cloudinary delivery over plain REST. Used for the optional report logo, not
 * for receipts: financial documents stay in private Neon object storage.
 */
export const CLOUDINARY_FOLDER = "spendwise";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = env.CLOUDINARY_CLOUD_NAME ?? env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) return null;
  return {
    cloudName,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}

export function cloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

function sign(params: Record<string, string>, secret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((name) => name + "=" + params[name])
    .join("&");
  return createHash("sha1")
    .update(payload + secret)
    .digest("hex");
}

export async function uploadToCloudinary(
  publicId: string,
  body: Uint8Array,
  contentType: string,
): Promise<string | null> {
  const config = getCloudinaryConfig();
  if (!config) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = sign(
    { folder: CLOUDINARY_FOLDER, public_id: publicId, timestamp },
    config.apiSecret,
  );

  const form = new FormData();
  form.set("file", new Blob([body as BlobPart], { type: contentType }));
  form.set("api_key", config.apiKey);
  form.set("timestamp", timestamp);
  form.set("folder", CLOUDINARY_FOLDER);
  form.set("public_id", publicId);
  form.set("signature", signature);

  const response = await fetch(
    "https://api.cloudinary.com/v1_1/" + config.cloudName + "/image/upload",
    { method: "POST", body: form },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Cloudinary upload failed (" + response.status + "): " + detail.slice(0, 200));
  }

  const payload = (await response.json()) as { public_id?: string };
  return payload.public_id ?? CLOUDINARY_FOLDER + "/" + publicId;
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  const config = getCloudinaryConfig();
  if (!config) return;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = sign({ public_id: publicId, timestamp }, config.apiSecret);
  const form = new FormData();
  form.set("public_id", publicId);
  form.set("api_key", config.apiKey);
  form.set("timestamp", timestamp);
  form.set("signature", signature);

  await fetch("https://api.cloudinary.com/v1_1/" + config.cloudName + "/image/destroy", {
    method: "POST",
    body: form,
  });
}

/** Only image uploads are allowed for logos. */
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
