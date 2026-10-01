import "server-only";

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  parseR2PublicBaseUrl,
  r2KeyFromPublicUrl,
  r2PublicUrlForKey,
} from "@/lib/uploads/r2MediaUrl";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

type R2Config = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: URL;
};

function publicBaseUrl(): URL | null {
  return parseR2PublicBaseUrl(process.env.R2_PUBLIC_BASE_URL);
}

function config(): R2Config {
  const publicUrl = publicBaseUrl();
  const accountId = process.env.R2_ACCOUNT_ID?.trim() || "";
  const bucket = process.env.R2_BUCKET?.trim() || "";
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim() || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim() || "";
  if (
    !publicUrl ||
    !/^[a-f0-9]{32}$/i.test(accountId) ||
    !/^[a-z0-9][a-z0-9-]{1,62}$/.test(bucket) ||
    !/^[a-f0-9]{32}$/i.test(accessKeyId) ||
    !/^[a-f0-9]{64}$/i.test(secretAccessKey)
  ) {
    throw new Error("R2 ürün medyası yapılandırması eksik veya geçersiz.");
  }
  return { accountId, bucket, accessKeyId, secretAccessKey, publicBaseUrl: publicUrl };
}

function client(settings: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${settings.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
  });
}

export function isR2ProductMediaEnabled(): boolean {
  return process.env.PRODUCT_MEDIA_BACKEND?.trim() === "r2";
}

export function r2ProductMediaUrl(key: string): string {
  const settings = config();
  return r2PublicUrlForKey(settings.publicBaseUrl, key);
}

export function r2ProductMediaKeyFromUrl(value: unknown): string | null {
  return r2KeyFromPublicUrl(publicBaseUrl(), value);
}

export async function uploadR2ProductMedia(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  const settings = config();
  const s3 = client(settings);
  try {
    await s3.send(new PutObjectCommand({
      Bucket: settings.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: CACHE_CONTROL,
      IfNoneMatch: "*",
    }));
    const head = await s3.send(new HeadObjectCommand({ Bucket: settings.bucket, Key: key }));
    if (head.ContentLength !== body.length) {
      throw new Error("R2 görsel boyutu doğrulanamadı.");
    }
    return r2ProductMediaUrl(key);
  } finally {
    s3.destroy();
  }
}

export async function deleteR2ProductMedia(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const settings = config();
  const s3 = client(settings);
  try {
    for (const key of keys) {
      await s3.send(new DeleteObjectCommand({ Bucket: settings.bucket, Key: key }));
    }
  } finally {
    s3.destroy();
  }
}
