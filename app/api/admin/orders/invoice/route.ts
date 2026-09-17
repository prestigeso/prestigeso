import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { render } from "@react-email/render";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { InvoiceEmail } from "@/components/emails/InvoiceEmail";
import { getOrderRecipient, type EmailOrder } from "@/lib/email/orderRecipient";
import { enqueueTransactionEmail, dispatchTransactionEmail } from "@/lib/email/transactionalOutbox";
import { limitedFormData, PayloadTooLarge } from "@/lib/http/limitedFormData";
import { logServerEvent } from "@/lib/logger";

export const runtime = "nodejs";
const MAX_INVOICE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req)))
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  try {
    const form = await limitedFormData(req, MAX_INVOICE_BYTES + 64 * 1024);
    const rawId = form.get("orderId");
    const orderId = Number(rawId);
    const file = form.get("invoice");
    if (typeof rawId !== "string" || !/^\d+$/.test(rawId) || !Number.isSafeInteger(orderId) || orderId <= 0 || !(file instanceof File))
      return NextResponse.json({ error: "Geçersiz sipariş veya dosya." }, { status: 400 });
    if (file.type !== "application/pdf" || file.size <= 0 || file.size > MAX_INVOICE_BYTES)
      return NextResponse.json({ error: "Fatura PDF formatında ve en fazla 10 MB olmalıdır." }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-")
      return NextResponse.json({ error: "Dosya geçerli bir PDF değil." }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("orders")
      .select("id,order_no,user_email,shipping_address,payment_status,status").eq("id", orderId).maybeSingle();
    if (error) throw new Error("ORDER_LOOKUP_FAILED");
    if (!data) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    const order = data as EmailOrder;
    if (!["paid", "partially_refunded", "refunded"].includes(order.payment_status))
      return NextResponse.json({ error: "Ödemesi doğrulanmamış siparişe fatura gönderilemez." }, { status: 409 });
    const recipient = getOrderRecipient(order);
    if (form.get("confirmedOrderNo") !== recipient.orderNumber)
      return NextResponse.json({ error: "Sipariş ve PDF eşleşmesini yeniden onaylayın." }, { status: 409 });
    // Caller-provided email/customerName are intentionally ignored.
    const digest = createHash("sha256").update(buffer).digest("hex");
    const event = await enqueueTransactionEmail({
      orderId, eventKey: `invoice:${digest}`, recipient: recipient.email,
      subject: `Sipariş Faturanız (${recipient.orderNumber}) - PrestigeSO`,
      html: await render(createElement(InvoiceEmail, { orderId: recipient.orderNumber, customerName: recipient.customerName })),
      attachments: [{ filename: `fatura-${orderId}.pdf`, content: buffer.toString("base64") }],
    });
    let deliveryStatus: string = event.status;
    if (deliveryStatus !== "sent") {
      try { deliveryStatus = (await dispatchTransactionEmail(event.id)).status; }
      catch { deliveryStatus = "unknown"; }
    }
    logServerEvent("info", "invoice_recorded", { orderId, emailEventId: event.id, deliveryStatus });
    return NextResponse.json({ success: true, eventId: event.id, deliveryStatus }, { status: deliveryStatus === "sent" ? 200 : 202 });
  } catch (error) {
    if (error instanceof PayloadTooLarge)
      return NextResponse.json({ error: "Fatura dosyası çok büyük." }, { status: 413 });
    logServerEvent("error", "invoice_record_failed", { error });
    return NextResponse.json({ error: "Fatura gönderimi kaydedilemedi. İşlemler panelini kontrol edin; yeniden göndermeden önce sonucu doğrulayın." }, { status: 500 });
  }
}
