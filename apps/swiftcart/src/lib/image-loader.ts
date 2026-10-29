import type { ImageLoaderProps } from "next/image";

/**
 * next/image loader for everything in this app. Cloudinary resizes and picks the
 * format, so the Next optimizer never touches these bytes. Only the public cloud
 * name is read, which keeps this safe to bundle anywhere.
 *
 * Configured once in next.config.ts as the project loader, so components never
 * pass a function across the server boundary.
 */
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const FOLDER = "swiftcart";

/** products/abc/def.png -> f_auto,q_auto,c_fill,w_640/swiftcart/products/abc/def */
export function cdnImageUrl(key: string, width: number): string {
  const publicId = FOLDER + "/" + key.replace(/^\/+/, "").replace(/\.[a-z0-9]+$/i, "");
  return (
    "https://res.cloudinary.com/" +
    CLOUD +
    "/image/upload/f_auto,q_auto,c_fill,w_" +
    Math.round(width) +
    "/" +
    publicId
  );
}

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  if (!CLOUD) return "/api/images/" + src.replace(/^\/+/, "");
  return cdnImageUrl(src, width);
}
