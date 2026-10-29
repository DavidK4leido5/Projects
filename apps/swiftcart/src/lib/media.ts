import "server-only";

import {
  publicIdForKey,
  uploadToCloudinary,
  deleteFromCloudinary,
  cloudinaryConfigured,
} from "@/lib/cloudinary";
import { storage } from "@/lib/storage";

export type SavedImage = { key: string; publicId: string | null };

/**
 * The single entry point for storing imagery. Every upload lands in Neon object
 * storage, and in Cloudinary when it is configured, so delivery can use the CDN
 * while the bucket stays the system of record. If Cloudinary rejects the asset
 * the object is removed again: both places or neither.
 */
export async function saveImage(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<SavedImage> {
  await storage.put(key, body, contentType);

  if (!cloudinaryConfigured()) return { key, publicId: null };

  try {
    const publicId = await uploadToCloudinary(key, body, contentType);
    return { key, publicId };
  } catch (error) {
    await storage.remove(key);
    throw error;
  }
}

export async function removeImage(key: string): Promise<void> {
  await storage.remove(key);
  if (cloudinaryConfigured()) {
    await deleteFromCloudinary(publicIdForKey(key)).catch(() => undefined);
  }
}
