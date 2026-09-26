// Never reads production credentials. NEXT_PUBLIC values require a fresh test build.
// Start phase0-fixture-server with the TLS key/certificate before invoking this.
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
const [action] = process.argv.slice(2);
if (!["build", "start"].includes(action)) throw new Error("Use: node scripts/phase0-local.mjs build|start");
const health = await fetch("http://127.0.0.1:54321/__health").then(r => r.json());
if (health.fixture !== true) throw new Error("Synthetic fixture must be running first");
const secret = process.env.PHASE0_ADMIN_TEST_SECRET || randomBytes(40).toString("hex");
if (secret.length < 32) throw new Error("Synthetic test secret must be at least 32 characters");
const env = { ...process.env,
  NODE_EXTRA_CA_CERTS: resolve("tmp/local-https-test/cert.pem"),
  NEXT_PUBLIC_SITE_URL: "https://www.prestigeso.com.tr",
  NEXT_PUBLIC_SUPABASE_URL: "https://127.0.0.1:54322",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "phase0-local-anon",
  SUPABASE_SERVICE_ROLE_KEY: "phase0-local-service",
  ADMIN_PASSWORD: `Local-Only!Aa9-${secret}`,
  ADMIN_COOKIE_SECRET: secret, RATE_LIMIT_SECRET: secret, OTP_PROOF_SECRET: secret, CRON_SECRET: secret,
  ADMIN_TOTP_SECRET: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
  PAYTR_TEST_MODE: "1", PAYTR_DEBUG_ON: "0", PAYTR_MERCHANT_ID: "phase0-disabled",
  PAYTR_MERCHANT_KEY: "phase0-disabled", PAYTR_MERCHANT_SALT: "phase0-disabled",
  RESEND_API_KEY: "re_phase0_disabled", RESEND_FROM_EMAIL: "Test <test@example.invalid>",
  TRENDYOL_READ_ONLY_ENABLED: "0", TRENDYOL_API_KEY: "", TRENDYOL_API_SECRET: "", TRENDYOL_SELLER_ID: "",
  GSC_READ_ONLY_ENABLED: "0", GSC_CLIENT_ID: "", GSC_CLIENT_SECRET: "", GSC_REFRESH_TOKEN: "",
  TRENDYOL_SYNC_ENABLED: "0",
  MARKETING_PREPARATION_ENABLED: "0",
};
const args = ["node_modules/next/dist/bin/next", action, ...(action === "start" ? ["--hostname", "127.0.0.1", "--port", "3100"] : [])];
const child = spawn(process.execPath, args, { env, stdio: "inherit", windowsHide: true });
child.on("exit", code => process.exit(code ?? 1));
