import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { render } from "@react-email/render";
import { isAdminRequest } from "@/lib/adminRequest";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { OrderDelivered } from "@/components/emails/OrderDelivered";
import { getOrderRecipient, type EmailOrder } from "@/lib/email/orderRecipient";
import { enqueueTransactionEmail, dispatchTransactionEmail } from "@/lib/email/transactionalOutbox";
import { logServerEvent } from "@/lib/logger";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  try {
    const body = await req.json();
    const orderId = Number(body?.orderId);
    if (!Number.isSafeInteger(orderId) || orderId <= 0 || body.type !== "delivered")
      return NextResponse.json({ error: "Geçersiz sipariş veya e-posta tipi." }, { status: 400 });
    const { data, error } = await supabaseAdmin.from("orders")
      .select("id,order_no,user_email,shipping_address,payment_status,status").eq("id", orderId).maybeSingle();
    if (error) throw new Error("ORDER_LOOKUP_FAILED");
    if (!data) return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    const order = data as EmailOrder;
    if (order.status !== "Teslim Edildi" || !["paid", "partially_refunded"].includes(order.payment_status))
      return NextResponse.json({ error: "Siparişin teslimatı doğrulanmamış." }, { status: 409 });
    const recipient = getOrderRecipient(order);
    const event = await enqueueTransactionEmail({
      orderId, eventKey: "order_delivered", recipient: recipient.email,
      subject: `Siparişiniz Teslim Edildi (${recipient.orderNumber}) - PrestigeSO`,
      html: await render(createElement(OrderDelivered, { orderId: recipient.orderNumber, customerName: recipient.customerName })),
    });
    let deliveryStatus: string = event.status;
    if (deliveryStatus !== "sent") {
      try { deliveryStatus = (await dispatchTransactionEmail(event.id)).status; }
      catch { deliveryStatus = "unknown"; }
    }
    return NextResponse.json({ success: true, eventId: event.id, deliveryStatus }, { status: deliveryStatus === "sent" ? 200 : 202 });
  } catch (error) {
    logServerEvent("error", "delivered_email_record_failed", { error });
    return NextResponse.json({ error: "E-posta kaydı tamamlanamadı. Tekrar göndermeden önce İşlem Güvenliği panelini kontrol edin." }, { status: 500 });
  }
}
