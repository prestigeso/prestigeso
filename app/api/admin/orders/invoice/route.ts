import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { InvoiceEmail } from "@/components/emails/InvoiceEmail";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");
    const fromEmail = process.env.RESEND_FROM_EMAIL || "info@prestigeso.com.tr";
    // 1) Admin yetki kontrolü
    const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();
    const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
    const adminSession = await verifyAdminSessionCookie(adminSecret, cookieValue);

    if (!adminSession) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // 2) Parse FormData
    const formData = await req.formData();
    const orderId = formData.get("orderId") as string;
    const customerName = formData.get("customerName") as string;
    const email = formData.get("email") as string;
    const file = formData.get("invoice") as File;

    if (!orderId || !email || !file) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    // Dosyayı buffer'a çevir
    const buffer = Buffer.from(await file.arrayBuffer());

    // 3) Resend ile mail at
    const { data, error } = await resend.emails.send({
      from: `PrestigeSO <${fromEmail}>`,
      to: [email],
      subject: `Sipariş Faturanız (${orderId}) - PrestigeSO`,
      react: InvoiceEmail({ orderId, customerName: customerName || "Müşterimiz" }) as any,
      attachments: [
        {
          filename: `fatura-${orderId}.pdf`,
          content: buffer,
        },
      ],
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Invoice send error:", error);
    return NextResponse.json({ error: error.message || "Bilinmeyen hata" }, { status: 500 });
  }
}
