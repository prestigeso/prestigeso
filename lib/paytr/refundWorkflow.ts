import { RefundError } from "./refundError.ts";
import { createPaytrRefundToken } from "./signatures.ts";

export type RefundStatus = "İptal Edildi" | "İade Edildi";
export type RefundInput = {
  orderId: number;
  newStatus: RefundStatus;
  customerUserId?: string;
  refundAmount?: number;
  returnRequestId?: number;
};

export type RefundOrderRow = {
  id: number;
  user_id: string | null;
  merchant_oid: string | null;
  total_amount: number | string;
  refunded_amount: number | string | null;
  payment_status: string;
  status: string;
  refund_started_at: string | null;
};

export type RefundUpdate = {
  status: string;
  payment_status: "refunded" | "partially_refunded";
  refunded_amount: number;
  refunded_at: string;
  refund_started_at: string;
};

export type RefundRepository = {
  getOrder: (id: number, userId?: string) => Promise<RefundOrderRow | null>;
  /** Compare-and-set against the read financial/status snapshot. */
  claimOrder: (order: RefundOrderRow, startedAt: string) => Promise<boolean>;
  releaseClaim: (id: number, startedAt: string) => Promise<boolean>;
  saveRefund: (order: RefundOrderRow, startedAt: string, update: RefundUpdate) => Promise<boolean>;
  markStockReleased: (id: number, at: string) => Promise<void>;
};

export type RefundDependencies = {
  repository: RefundRepository;
  credentials: { merchantId?: string; merchantKey?: string; merchantSalt?: string };
  fetch: typeof fetch;
  now: () => string;
  releaseOrderStock: (orderId: number) => Promise<void>;
  releaseReturnStock: (requestId: number) => Promise<void>;
};

function cents(value: unknown): number {
  if (typeof value !== "number" && typeof value !== "string") return NaN;
  if (typeof value === "string" && !/^\d+(?:\.\d{1,2})?$/.test(value)) return NaN;
  const number = Number(value);
  const result = Math.round(number * 100);
  return Number.isFinite(number) && number >= 0 &&
    Number(number.toFixed(2)) === number && Number.isSafeInteger(result)
    ? result
    : NaN;
}

function reconciliation(message: string, status = 502) {
  return new RefundError(`${message} İadeyi tekrar başlatmayın; manuel mutabakat gerekiyor.`, status);
}

/** No implicit network/database dependencies: failure branches are tested without live funds. */
export async function runRefundWorkflow(input: RefundInput, deps: RefundDependencies) {
  const { orderId, newStatus, customerUserId, refundAmount, returnRequestId } = input;
  const { repository } = deps;
  if (!Number.isSafeInteger(orderId) || orderId <= 0 ||
      (returnRequestId != null && (!Number.isSafeInteger(returnRequestId) || returnRequestId <= 0)) ||
      !["İptal Edildi", "İade Edildi"].includes(newStatus)) {
    throw new RefundError("Geçersiz iade işlemi.", 400, true);
  }

  let order: RefundOrderRow | null;
  try {
    order = await repository.getOrder(orderId, customerUserId);
  } catch {
    throw new RefundError("Sipariş okunamadı.", 500, true);
  }
  if (!order) throw new RefundError("Sipariş bulunamadı.", 404, true);
  if (customerUserId && order.user_id !== customerUserId)
    throw new RefundError("Sipariş bulunamadı.", 404, true);
  // A retained lock can mean the provider outcome is unknown, not just a running request.
  if (order.refund_started_at)
    throw reconciliation("Bu siparişte devam eden veya sonucu doğrulanmamış bir iade var.", 409);
  if (order.payment_status === "refunded") {
    if (returnRequestId)
      throw reconciliation("Sipariş zaten tamamen iade edilmiş; bu talebin finansal sonucu ayrıca doğrulanmalı.", 409);
    try { await deps.releaseOrderStock(order.id); }
    catch { throw reconciliation("Para iadesi kayıtlı fakat stok işlemi tamamlanamadı.", 500); }
    return { orderId: order.id, status: order.status, alreadyRefunded: true };
  }
  if (!["paid", "partially_refunded"].includes(order.payment_status))
    throw new RefundError("Ödenmemiş sipariş için iade yapılamaz.", 400, true);
  if (order.payment_status === "partially_refunded" && !returnRequestId)
    throw new RefundError("Kısmi iadesi bulunan sipariş yalnızca kayıtlı iade talebi üzerinden tamamlanabilir.", 409, true);
  if (customerUserId && (newStatus !== "İptal Edildi" ||
      !["Bekliyor", "İşleniyor", "Hazırlanıyor"].includes(order.status))) {
    throw new RefundError("Sipariş bu aşamada müşteri tarafından iptal edilemez.", 409, true);
  }

  const paid = cents(order.total_amount);
  const previous = cents(order.refunded_amount ?? 0);
  const remaining = paid - previous;
  const requested = refundAmount == null ? remaining : cents(refundAmount);
  if (!Number.isSafeInteger(paid) || !Number.isSafeInteger(previous) ||
      !Number.isSafeInteger(requested) || requested <= 0 || requested > remaining) {
    throw new RefundError("İade tutarı geçersiz.", 400, true);
  }
  const { merchantId, merchantKey, merchantSalt } = deps.credentials;
  if (!merchantId || !merchantKey || !merchantSalt)
    throw new RefundError("PayTR ayarları eksik.", 500, true);
  const merchantOid = order.merchant_oid || "";
  if (!/^[A-Za-z0-9]+$/.test(merchantOid))
    throw new RefundError("Siparişin PayTR numarası geçersiz.", 409, true);

  const startedAt = deps.now();
  let claimed: boolean;
  try { claimed = await repository.claimOrder(order, startedAt); }
  catch { throw reconciliation("İade kilidinin sonucu doğrulanamadı.", 500); }
  if (!claimed)
    throw new RefundError("Sipariş değişti veya başka bir iade devam ediyor; durumu yenileyin.", 409);

  const returnAmount = (requested / 100).toFixed(2);
  // This reference aids reconciliation; PayTR does not document it as an idempotency key.
  const reference = returnRequestId ? `PRSRETURN${returnRequestId}` : `PRSORDER${order.id}`;
  const params = new URLSearchParams({
    merchant_id: merchantId,
    merchant_oid: merchantOid,
    return_amount: returnAmount,
    reference_no: reference,
    paytr_token: createPaytrRefundToken({ merchantId, merchantOid, returnAmount, merchantSalt, merchantKey }),
  });
  let result: Record<string, unknown>;
  try {
    const response = await deps.fetch("https://www.paytr.com/odeme/iade", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) throw new Error("Non-success HTTP response");
    const json: unknown = await response.json();
    if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("Invalid response");
    result = json as Record<string, unknown>;
  } catch {
    // Do not clear the durable lock: PayTR may have refunded before the reply was lost.
    throw reconciliation("PayTR iade sonucu alınamadı veya doğrulanamadı.");
  }
  if (result.status === "failed" || result.status === "error") {
    let released: boolean;
    try { released = await repository.releaseClaim(order.id, startedAt); }
    catch { throw reconciliation("PayTR isteği reddetti fakat iade kilidi güncellenemedi.", 500); }
    if (!released) throw reconciliation("PayTR isteği reddetti fakat iade kilidi değişmiş.", 409);
    throw new RefundError("PayTR iade isteğini reddetti. İşlem bilgilerini ve mağaza panelini kontrol edin.", 400, true);
  }
  if (result.status !== "success" || result.merchant_oid !== merchantOid ||
      cents(result.return_amount) !== requested ||
      (result.reference_no != null && result.reference_no !== reference)) {
    throw reconciliation("PayTR iade yanıtı sipariş/tutar ile eşleşmiyor.");
  }

  const cumulative = previous + requested;
  const fullyRefunded = cumulative === paid;
  const finalStatus = fullyRefunded ? newStatus : "Kısmi İade";
  let saved: boolean;
  try {
    saved = await repository.saveRefund(order, startedAt, {
      status: finalStatus,
      payment_status: fullyRefunded ? "refunded" : "partially_refunded",
      refunded_amount: cumulative / 100,
      refunded_at: deps.now(),
      // Keep the same order lock until both financial and inventory work are durable.
      refund_started_at: startedAt,
    });
  } catch { throw reconciliation("PayTR iadesi tamamlandı fakat sipariş kaydı doğrulanamadı.", 500); }
  if (!saved) throw reconciliation("PayTR iadesi tamamlandı fakat sipariş kilidi/kaydı değişmiş.", 409);
  try {
    if (returnRequestId) {
      await deps.releaseReturnStock(returnRequestId);
      if (fullyRefunded) await repository.markStockReleased(order.id, deps.now());
    } else if (fullyRefunded) {
      await deps.releaseOrderStock(order.id);
    }
  } catch { throw reconciliation("Ödeme iadesi tamamlandı fakat stok işlemi tamamlanamadı.", 500); }
  let released: boolean;
  try { released = await repository.releaseClaim(order.id, startedAt); }
  catch { throw reconciliation("İade ve stok işlendi fakat işlem kilidi doğrulanamadı.", 500); }
  if (!released) throw reconciliation("İade ve stok işlendi fakat işlem kilidi değişmiş.", 409);
  return { orderId: order.id, status: finalStatus, refundAmount: requested / 100, fullyRefunded, alreadyRefunded: false };
}
