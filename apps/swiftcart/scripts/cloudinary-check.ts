import { createHash } from "node:crypto";
import {
  cloudinaryConfigured,
  deleteFromCloudinary,
  uploadToCloudinary,
} from "../src/lib/cloudinary.js";

/**
 * Writes one tiny asset into the swiftcart folder, reports the delivery URL, and
 * removes it. This is the only way to know the key can actually upload: a key
 * that exists but lacks create permission authenticates and then refuses.
 */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

async function main() {
  if (!cloudinaryConfigured()) {
    console.log("not configured: CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET are missing");
    process.exit(1);
  }

  const stamp = Date.now().toString();
  const key = "health/" + stamp + ".png";

  try {
    const publicId = await uploadToCloudinary(key, new Uint8Array(PIXEL), "image/png");
    console.log("upload: ok");
    console.log("public id:", publicId);

    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const url =
      "https://res.cloudinary.com/" + cloud + "/image/upload/f_auto,q_auto,w_64/" + publicId;
    const fetched = await fetch(url);
    console.log("delivery:", fetched.status, fetched.headers.get("content-type"));

    if (publicId) await deleteFromCloudinary(publicId);
    console.log("cleanup: ok");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("upload: FAILED");
    console.log(message);
    if (message.includes("missing permissions")) {
      console.log("");
      console.log("The key authenticates but cannot create assets. In the Cloudinary console,");
      console.log(
        "Settings > API Keys, either enable Create for this key or make a new unrestricted key.",
      );
    }
    process.exit(1);
  }
}

void createHash;
main().then(() => process.exit(0));
