import { existsSync } from "node:fs";

if (existsSync(".env.local") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env.local");
}

const required = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_PASSWORD",
  "ADMIN_COOKIE_SECRET",
  "ADMIN_TOTP_SECRET",
  "RATE_LIMIT_SECRET",
  "OTP_PROOF_SECRET",
  "CRON_SECRET",
  "PAYTR_MERCHANT_ID",
  "PAYTR_MERCHANT_KEY",
  "PAYTR_MERCHANT_SALT",
  "PAYTR_TEST_MODE",
  "PAYTR_DEBUG_ON",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
];

const missing = required.filter(
  (name) => !String(process.env[name] || "").trim(),
);
const weakSecrets = [
  "ADMIN_COOKIE_SECRET",
  "RATE_LIMIT_SECRET",
  "OTP_PROOF_SECRET",
  "CRON_SECRET",
].filter((name) => String(process.env[name] || "").length < 32);
const adminPassword = String(process.env.ADMIN_PASSWORD || "").trim();
const weakAdminPassword =
  adminPassword.length < 16 ||
  !/[a-z]/.test(adminPassword) ||
  !/[A-Z]/.test(adminPassword) ||
  !/\d/.test(adminPassword) ||
  !/[^A-Za-z0-9]/.test(adminPassword);
const normalizedTotpSecret = String(process.env.ADMIN_TOTP_SECRET || "")
  .toUpperCase()
  .replace(/[\s=-]/g, "");
const invalidTotpSecret =
  normalizedTotpSecret.length < 32 || !/^[A-Z2-7]+$/.test(normalizedTotpSecret);
const invalidPaytrFlags = ["PAYTR_TEST_MODE", "PAYTR_DEBUG_ON"].filter(
  (name) =>
    process.env[name] !== undefined && !["0", "1"].includes(process.env[name]),
);

if (
  missing.length ||
  weakSecrets.length ||
  weakAdminPassword ||
  invalidTotpSecret ||
  invalidPaytrFlags.length
) {
  if (missing.length)
    console.error(`Eksik ortam değişkenleri: ${missing.join(", ")}`);
  if (weakSecrets.length)
    console.error(
      `En az 32 karakter olması gereken değişkenler: ${weakSecrets.join(", ")}`,
    );
  if (weakAdminPassword)
    console.error(
      "ADMIN_PASSWORD en az 16 karakter ve büyük harf, küçük harf, rakam ile sembol içermelidir.",
    );
  if (invalidTotpSecret)
    console.error(
      "ADMIN_TOTP_SECRET en az 32 karakterlik geçerli bir Base32 anahtarı olmalıdır.",
    );
  if (invalidPaytrFlags.length)
    console.error(
      `Yalnızca 0 veya 1 olabilen değişkenler: ${invalidPaytrFlags.join(", ")}`,
    );
  process.exit(1);
}

console.log("Üretim ortam değişkenleri doğrulandı.");
