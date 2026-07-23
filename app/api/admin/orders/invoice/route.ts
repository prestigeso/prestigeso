import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/adminAuth";
import { InvoiceEmail } from "@/components/emails/InvoiceEmail";
import type { ReactElement } from "react";

export const runtime = "nodejs";
const MAX_INVOICE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
      return NextResponse.json(
        { error: "E-posta servisi yapılandırılmamış." },
        { status: 503 },
      );
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    // 1) Admin yetki kontrolü
    const adminSecret = (process.env.ADMIN_COOKIE_SECRET ?? "").trim();
    const cookieValue = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? "";
    const adminSession = await verifyAdminSessionCookie(
      adminSecret,
      cookieValue,
    );

    if (!adminSession) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // 2) Parse FormData
    const formData = await req.formData();
    const orderId = formData.get("orderId") as string;
    const customerName = formData.get("customerName") as string;
    const email = formData.get("email") as string;
    const file = formData.get("invoice") as File;

    if (
      !/^\d+$/.test(orderId || "") ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || "") ||
      !(file instanceof File)
    ) {
      return NextResponse.json(
        { error: "Eksik parametreler" },
        { status: 400 },
      );
    }

    if (
      file.type !== "application/pdf" ||
      file.size <= 0 ||
      file.size > MAX_INVOICE_BYTES
    ) {
      return NextResponse.json(
        { error: "Fatura PDF formatında ve en fazla 10 MB olmalıdır." },
        { status: 400 },
      );
    }

    // Dosyayı buffer'a çevir
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json(
        { error: "Dosya geçerli bir PDF değil." },
        { status: 400 },
      );
    }

    // 3) Resend ile mail at
    const { data, error } = await resend.emails.send({
      from: `PrestigeSO <${fromEmail}>`,
      to: [email],
      subject: `Sipariş Faturanız (${orderId}) - PrestigeSO`,
      react: InvoiceEmail({
        orderId,
        customerName: customerName || "Müşterimiz",
      }) as ReactElement,
      attachments: [
        {
          filename: `fatura-${orderId}.pdf`,
          content: buffer.toString("base64"),
        },
      ],
    });

    if (error) {
      console.error("Resend invoice API error:", error);
      return NextResponse.json(
        {
          error: error.message || "Fatura maili gönderilirken bir hata oluştu.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error("Invoice send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 500 },
    );
  }
}
