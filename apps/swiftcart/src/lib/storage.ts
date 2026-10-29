import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type StoredObject = {
  body: Uint8Array;
  contentType: string;
};

/**
 * Every file in the app goes through this interface. Swapping Neon object
 * storage for S3 or R2 means replacing one implementation, nothing else.
 */
export type ObjectStorage = {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  remove(key: string): Promise<void>;
};

function firstDefined(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

const endpoint = firstDefined(
  "OBJECT_STORAGE_ENDPOINT",
  "AWS_ENDPOINT_URL",
  "S3_ENDPOINT",
  "NEON_STORAGE_ENDPOINT",
);
const region = firstDefined("OBJECT_STORAGE_REGION", "AWS_REGION", "AWS_DEFAULT_REGION") ?? "auto";
const bucket = firstDefined(
  "OBJECT_STORAGE_BUCKET",
  "AWS_BUCKET_NAME",
  "S3_BUCKET",
  "NEON_STORAGE_BUCKET",
);
const accessKeyId = firstDefined("OBJECT_STORAGE_ACCESS_KEY_ID", "AWS_ACCESS_KEY_ID");
const secretAccessKey = firstDefined("OBJECT_STORAGE_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY");

export function storageConfigured(): boolean {
  return Boolean(endpoint && bucket && accessKeyId && secretAccessKey);
}

let client: S3Client | undefined;
let resolvedBucket: string | undefined;

function s3(): S3Client {
  if (client) return client;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Object storage is not configured. Expected OBJECT_STORAGE_* (or AWS_*) env vars.",
    );
  }
  resolvedBucket = bucket;
  client = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export const storage: ObjectStorage = {
  async put(key, body, contentType) {
    await s3().send(
      new PutObjectCommand({
        Bucket: resolvedBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  },

  async get(key) {
    try {
      const result = await s3().send(new GetObjectCommand({ Bucket: resolvedBucket, Key: key }));
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) return null;
      return { body: bytes, contentType: result.ContentType ?? "application/octet-stream" };
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") return null;
      throw error;
    }
  },

  async remove(key) {
    await s3().send(new DeleteObjectCommand({ Bucket: resolvedBucket, Key: key }));
  },
};
