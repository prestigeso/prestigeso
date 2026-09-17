import { after, NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { dispatchTransactionEmail } from "@/lib/email/transactionalOutbox";
import { validatePaytrNotification } from "@/lib/paytr/notification";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
    if (!merchantKey || !merchantSalt)
      return new NextResponse("PAYTR ENV ERROR", { status: 500 });

    // Bound form input before parsing; provider callbacks contain only a few KB.
    const reader = req.body?.getReader();
    if (!reader) return new NextResponse("PAYTR notification missing", { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        return new NextResponse("PAYTR notification too large", { status: 413 });
      }
      chunks.push(chunk.value);
    }
    const body = Buffer.concat(chunks).toString("utf8");
    const validation = validatePaytrNotification(new URLSearchParams(body), { merchantKey, merchantSalt });
    if (!validation.ok)
      return new NextResponse(`PAYTR notification failed: ${validation.reason}`, { status: 400 });

    const notification = validation.notification;
    const { data, error } = await supabaseAdmin.rpc("record_verified_paytr_result", {
      p_merchant_oid: notification.merchantOid,
      p_status: notification.status,
      p_total_amount: notification.totalAmount,
      p_source: "callback",
      p_failure_reason: notification.failureReason,
    });
    if (error || !data?.action) {
      const code = error?.message?.includes("PAYMENT_AMOUNT_MISMATCH") ? "amount mismatch" :
        error?.message?.includes("ORDER_NOT_FOUND") ? "order not found" : "storage unavailable";
      return new NextResponse(`PAYTR notification failed: ${code}`, { status: code === "storage unavailable" ? 500 : 400 });
    }

    // Durable payment + email intent are already committed atomically. This is
    // only an immediate delivery attempt; a crash is recovered by maintenance.
    if (typeof data.outbox_id === "string") {
      const outboxId = data.outbox_id;
      after(async () => {
        try { await dispatchTransactionEmail(outboxId); }
        catch { console.error("PayTR confirmation remains in durable outbox", { outboxId }); }
      });
    }
    return new NextResponse("OK");
  } catch {
    console.error("PayTR callback storage/validation failure");
    return new NextResponse("PAYTR callback unexpected error", { status: 500 });
  }
}
