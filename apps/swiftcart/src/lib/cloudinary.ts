import { createHash } from "node:crypto";

/**
 * Cloudinary delivery, signed uploads over plain REST. No SDK: the signature is
 * a sha1 over the alphabetically sorted parameters, which is all the SDK would
 * do for us.
 */

export const CLOUDINARY_FOLDER = "swiftcart";

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function first(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = first(
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_CLOUDNAME",
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  );
  const apiKey = first("CLOUDINARY_API_KEY");
  const apiSecret = first("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function cloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

/** products/abc/def.png -> swiftcart/products/abc/def */
export function publicIdForKey(key: string): string {
  const clean = key.replace(/^\/+/, "").replace(/\.[a-z0-9]+$/i, "");
  return CLOUDINARY_FOLDER + "/" + clean;
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
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<string | null> {
  const config = getCloudinaryConfig();
  if (!config) return null;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const publicId = key.replace(/^\/+/, "").replace(/\.[a-z0-9]+$/i, "");

  const signed = sign(
    { folder: CLOUDINARY_FOLDER, public_id: publicId, timestamp },
    config.apiSecret,
  );

  const form = new FormData();
  form.set("file", new Blob([body as unknown as BlobPart], { type: contentType }));
  form.set("api_key", config.apiKey);
  form.set("timestamp", timestamp);
  form.set("folder", CLOUDINARY_FOLDER);
  form.set("public_id", publicId);
  form.set("signature", signed);

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

const WIDTHS = [320, 640, 960, 1280, 1600];

/** Responsive candidate list, or null when Cloudinary is not configured. */
export function imageSources(key: string, width: number): { src: string; srcSet?: string } | null {
  const config = getCloudinaryConfig();
  if (!config) return null;

  const base = "https://res.cloudinary.com/" + config.cloudName + "/image/upload";
  const id = publicIdForKey(key);
  const at = (w: number) => base + "/f_auto,q_auto,c_fill,w_" + w + "/" + id;

  return {
    src: at(width),
    srcSet: WIDTHS.map((w) => at(w) + " " + w + "w").join(", "),
  };
}
