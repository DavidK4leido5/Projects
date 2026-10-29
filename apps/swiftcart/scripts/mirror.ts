import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getDb } from "../src/lib/db/index.js";
import { productImages } from "../src/lib/db/schema.js";
import { cloudinaryConfigured, uploadToCloudinary } from "../src/lib/cloudinary.js";
import { getStorageConfig } from "../src/lib/env.js";

/**
 * Copies already stored product images into Cloudinary. Images uploaded before
 * Cloudinary was configured exist only in the bucket, and delivery URLs point
 * straight at the CDN, so they would 404 until mirrored once.
 */
async function main() {
  if (!cloudinaryConfigured()) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are required.",
    );
  }

  const config = getStorageConfig();
  if (!config) throw new Error("Object storage is not configured.");

  const s3 = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });

  const rows = await getDb().select({ key: productImages.key }).from(productImages);

  let mirrored = 0;
  for (const row of rows) {
    if (!row.key) continue;
    const object = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: row.key }));
    const body = await object.Body?.transformToByteArray();
    if (!body) {
      console.log("missing in bucket:", row.key);
      continue;
    }
    await uploadToCloudinary(row.key, body, object.ContentType ?? "image/png");
    mirrored += 1;
  }

  console.log("mirrored " + mirrored + " of " + rows.length + " images");
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
