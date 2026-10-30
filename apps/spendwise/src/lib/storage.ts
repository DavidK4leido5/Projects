import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

export const RECEIPTS_PREFIX = "spendwise/receipts";
export const RECEIPT_TYPES: readonly string[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
];
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

let client: S3Client | undefined;

/** Neon Object Storage speaks S3 with path-style addressing. */
export function s3(): S3Client {
  client ??= new S3Client({
    region: env.AWS_REGION,
    endpoint: env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export async function uploadObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await s3().send(
    new PutObjectCommand({
      Bucket: env.OBJECT_STORAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "private, max-age=0, no-store",
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: env.OBJECT_STORAGE_BUCKET, Key: key }));
}

/** Private objects are only readable through a short-lived presigned URL. */
export async function signedDownloadUrl(key: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: env.OBJECT_STORAGE_BUCKET, Key: key }), {
    expiresIn,
  });
}

export function receiptKey(userId: string, fileName: string): string {
  const extension = fileName.includes(".")
    ? (fileName.split(".").pop()?.toLowerCase() ?? "bin")
    : "bin";
  const safe = extension.replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";
  return RECEIPTS_PREFIX + "/" + userId + "/" + crypto.randomUUID() + "." + safe;
}
