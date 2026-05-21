export const ADMIN_COOKIE_NAME = "prestigeso_admin";
export const ADMIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type AdminCookiePayload = {
  iat: number;
  exp: number;
  nonce: string;
};

const keyCache = new Map<string, CryptoKey>();
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

const toBase64Url = (bytes: Uint8Array): string => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }

  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const fromBase64Url = (value: string): Uint8Array => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const base64 = `${padded}${"=".repeat(padLength)}`;

  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const getHmacKey = async (secret: string): Promise<CryptoKey> => {
  const cached = keyCache.get(secret);

  if (cached) return cached;

  const secretBytes = encoder.encode(secret);

  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(secretBytes),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  keyCache.set(secret, key);

  return key;
};

export const createAdminSessionCookie = async (
  secret: string
): Promise<string> => {
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);

  const now = Date.now();

  const payload: AdminCookiePayload = {
    iat: now,
    exp: now + ADMIN_COOKIE_MAX_AGE_SECONDS * 1000,
    nonce: toBase64Url(nonceBytes),
  };

  const payloadEncoded = toBase64Url(
    encoder.encode(JSON.stringify(payload))
  );

  const key = await getHmacKey(secret);

  const payloadBytes = encoder.encode(payloadEncoded);

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    toArrayBuffer(payloadBytes)
  );

  const signatureEncoded = toBase64Url(new Uint8Array(signature));

  return `${payloadEncoded}.${signatureEncoded}`;
};

export const verifyAdminSessionCookie = async (
  secret: string,
  cookieValue: string
): Promise<boolean> => {
  if (!secret || !cookieValue) return false;

  const [payloadEncoded, signatureEncoded] = cookieValue.split(".");

  if (!payloadEncoded || !signatureEncoded) return false;

  let payload: AdminCookiePayload;

  try {
    const payloadBytes = fromBase64Url(payloadEncoded);
    payload = JSON.parse(decoder.decode(payloadBytes)) as AdminCookiePayload;
  } catch {
    return false;
  }

  if (!payload?.exp || Date.now() > payload.exp) return false;

  const key = await getHmacKey(secret);
  const signatureBytes = fromBase64Url(signatureEncoded);
  const payloadBytes = encoder.encode(payloadEncoded);

  return crypto.subtle.verify(
    "HMAC",
    key,
    toArrayBuffer(signatureBytes),
    toArrayBuffer(payloadBytes)
  );
};