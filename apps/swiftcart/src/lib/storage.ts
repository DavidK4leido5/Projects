import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getStorageConfig, type StorageConfig } from "@/lib/env";

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

export function storageConfigured(): boolean {
  return getStorageConfig() !== null;
}

let client: S3Client | undefined;
let config: StorageConfig | undefined;

function s3(): { client: S3Client; bucket: string } {
  if (!config) {
    const resolved = getStorageConfig();
    if (!resolved) {
      throw new Error(
        "Object storage is not configured. Set OBJECT_STORAGE_ENDPOINT, OBJECT_STORAGE_BUCKET, " +
          "OBJECT_STORAGE_ACCESS_KEY_ID, OBJECT_STORAGE_SECRET_ACCESS_KEY, or their AWS_* equivalents.",
      );
    }
    config = resolved;
  }

  client ??= new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client, bucket: config.bucket };
}

export const storage: ObjectStorage = {
  async put(key, body, contentType) {
    const { client: s3Client, bucket } = s3();
    await s3Client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
    );
  },

  async get(key) {
    const { client: s3Client, bucket } = s3();
    try {
      const result = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const bytes = await result.Body?.transformToByteArray();
      if (!bytes) return null;
      return { body: bytes, contentType: result.ContentType ?? "application/octet-stream" };
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") return null;
      throw error;
    }
  },

  async remove(key) {
    const { client: s3Client, bucket } = s3();
    await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};
