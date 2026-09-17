import "server-only";
import crypto from "crypto";
import type { PaytrStatusResult } from "./statusComparison";
export { comparePaytrStatus } from "./statusComparison";
export type { PaytrStatusResult } from "./statusComparison";

export async function queryPaytrStatus(merchantOid: string) {
  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantId || !merchantKey || !merchantSalt) throw new Error("PayTR ayarları eksik.");
  if (!/^[A-Za-z0-9]{1,64}$/.test(merchantOid)) throw new Error("Geçersiz sipariş numarası.");
  const paytrToken = crypto.createHmac("sha256", merchantKey)
    .update(`${merchantId}${merchantOid}${merchantSalt}`).digest("base64");
  const response = await fetch("https://www.paytr.com/odeme/durum-sorgu", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ merchant_id: merchantId, merchant_oid: merchantOid, paytr_token: paytrToken }),
    signal: AbortSignal.timeout(15000), cache: "no-store", redirect: "error",
  });
  const result: unknown = await response.json();
  if (!response.ok || !result || typeof result !== "object" || !("status" in result) || result.status !== "success")
    throw new Error("PayTR durum sorgusu kesin bir ödeme kaydı döndürmedi.");
  return result as PaytrStatusResult;
}
