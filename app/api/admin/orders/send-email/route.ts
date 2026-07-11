import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { OrderDelivered } from "@/components/emails/OrderDelivered";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "info@prestigeso.com.tr";

export async function POST(req: NextRequest) {
  try {
    // 1) Admin yetki kontrolü
    const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();
    const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
    const adminSession = await verifyAdminSessionCookie(adminSecret, cookieValue);

    if (!adminSession) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // 2) Body parsing
    const body = await req.json();
    const { orderId, customerName, email, type } = body;

    if (!orderId || !email || !type) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    if (type === "delivered") {
      const { data, error } = await resend.emails.send({
        from: `PrestigeSO <${fromEmail}>`,
        to: [email],
        subject: "Siparişiniz Teslim Edildi 🎉 - PrestigeSO",
        react: OrderDelivered({ orderId, customerName: customerName || "Müşterimiz" }),
      });

      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ error: "Geçersiz e-posta tipi" }, { status: 400 });
  } catch (error: any) {
    console.error("Email send error:", error);
    return NextResponse.json({ error: error.message || "Bilinmeyen hata" }, { status: 500 });
  }
}
