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
  "RATE_LIMIT_SECRET",
  "OTP_PROOF_SECRET",
  "CRON_SECRET",
  "PAYTR_MERCHANT_ID",
  "PAYTR_MERCHANT_KEY",
  "PAYTR_MERCHANT_SALT",
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

if (missing.length || weakSecrets.length) {
  if (missing.length)
    console.error(`Eksik ortam değişkenleri: ${missing.join(", ")}`);
  if (weakSecrets.length)
    console.error(
      `En az 32 karakter olması gereken değişkenler: ${weakSecrets.join(", ")}`,
    );
  process.exit(1);
}

console.log("Üretim ortam değişkenleri doğrulandı.");
