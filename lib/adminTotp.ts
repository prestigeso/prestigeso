import crypto from "node:crypto";
import {
  isValidTotpSecret,
  normalizeTotpSecret,
} from "./adminSecurity.ts";

const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = normalizeTotpSecret(value);
  let bits = 0;
  let bitCount = 0;
  const bytes: number[] = [];

  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Geçersiz TOTP anahtarı.");
    bits = (bits << 5) | index;
    bitCount += 5;

    while (bitCount >= 8) {
      bitCount -= 8;
      bytes.push((bits >>> bitCount) & 0xff);
      bits &= (1 << bitCount) - 1;
    }
  }

  return Buffer.from(bytes);
}

export function createAdminTotp(
  secret: string,
  timestampMs = Date.now(),
) {
  if (!isValidTotpSecret(secret)) throw new Error("Geçersiz TOTP anahtarı.");

  const counter = Math.floor(timestampMs / 1000 / TOTP_STEP_SECONDS);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = crypto
    .createHmac("sha1", decodeBase32(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    (((digest[offset] & 0x7f) << 24) |
      (digest[offset + 1] << 16) |
      (digest[offset + 2] << 8) |
      digest[offset + 3]) >>>
    0;

  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function verifyAdminTotp(
  input: string,
  secret: string,
  timestampMs = Date.now(),
  window = 1,
) {
  const code = input.trim();
  if (!/^\d{6}$/.test(code) || !isValidTotpSecret(secret)) return false;

  const inputBuffer = Buffer.from(code, "utf8");
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = createAdminTotp(
      secret,
      timestampMs + offset * TOTP_STEP_SECONDS * 1000,
    );
    if (crypto.timingSafeEqual(inputBuffer, Buffer.from(expected, "utf8"))) {
      return true;
    }
  }

  return false;
}
