import crypto from "node:crypto";

function toBase32(bytes) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let bitCount = 0;
  let result = "";

  for (const byte of bytes) {
    bits = (bits << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      bitCount -= 5;
      result += alphabet[(bits >>> bitCount) & 31];
      bits &= (1 << bitCount) - 1;
    }
  }

  if (bitCount > 0) result += alphabet[(bits << (5 - bitCount)) & 31];
  return result;
}

const issuer = String(process.env.ADMIN_TOTP_ISSUER || "PrestigeSO").trim();
const account = String(process.env.ADMIN_TOTP_ACCOUNT || "admin").trim();

if (!issuer || !account) {
  console.error("TOTP issuer ve hesap adı boş olamaz.");
  process.exit(1);
}

const secret = toBase32(crypto.randomBytes(20));
const label = encodeURIComponent(`${issuer}:${account}`);
const uri = new URL(`otpauth://totp/${label}`);
uri.searchParams.set("secret", secret);
uri.searchParams.set("issuer", issuer);
uri.searchParams.set("algorithm", "SHA1");
uri.searchParams.set("digits", "6");
uri.searchParams.set("period", "30");

console.log("Yeni admin TOTP anahtarı üretildi.");
console.log("Bu değerleri yalnız Authenticator ve Vercel Production ortamına ekleyin.");
console.log(`ADMIN_TOTP_SECRET=${secret}`);
console.log(`Authenticator URI=${uri.toString()}`);
