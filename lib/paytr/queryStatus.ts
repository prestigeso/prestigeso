import "server-only";
import crypto from "crypto";

export type PaytrStatusResult = {
  status?: string;
  payment_amount?: string | number;
  payment_total?: string | number;
  currency?: string;
  payment_date?: string;
  returns?: unknown[];
  err_no?: string | number;
  err_msg?: string;
};

export async function queryPaytrStatus(merchantOid: string) {
  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantId || !merchantKey || !merchantSalt)
    throw new Error("PayTR ayarları eksik.");
  const paytrToken = crypto
    .createHmac("sha256", merchantKey)
    .update(`${merchantId}${merchantOid}${merchantSalt}`)
    .digest("base64");
  const response = await fetch("https://www.paytr.com/odeme/durum-sorgu", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      merchant_id: merchantId,
      merchant_oid: merchantOid,
      paytr_token: paytrToken,
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const result = (await response.json()) as PaytrStatusResult;
  if (!response.ok || result.status !== "success")
    throw new Error(result.err_msg || "PayTR durum sorgusu başarısız.");
  return result;
}

export function comparePaytrStatus(
  localAmount: number,
  localRefundedAmount: number,
  remote: PaytrStatusResult,
) {
  const remotePayment = Number(remote.payment_amount);
  const remoteTotal = Number(remote.payment_total);
  const amountMatches = [remotePayment, remoteTotal].some(
    (amount) => Number.isFinite(amount) && Math.abs(amount - localAmount) < 0.01,
  );
  const remoteRefunded = Array.isArray(remote.returns)
    ? remote.returns.reduce<number>((sum, value) => {
        if (!value || typeof value !== "object") return sum;
        const row = value as Record<string, unknown>;
        const amount = Number(row.return_amount || row.amount || 0);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0)
    : 0;
  const refundMatches = Math.abs(remoteRefunded - localRefundedAmount) < 0.01;
  return {
    status: amountMatches && refundMatches ? "matched" : "mismatch",
    detail: {
      localAmount,
      localRefundedAmount,
      remotePayment,
      remoteTotal,
      remoteRefunded,
      currency: remote.currency || null,
      paymentDate: remote.payment_date || null,
    },
  };
}
