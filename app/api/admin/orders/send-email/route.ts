import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import type { ReactElement } from "react";
import { isAdminRequest } from "@/lib/adminRequest";
import { OrderDelivered } from "@/components/emails/OrderDelivered";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!(await isAdminRequest(req))) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)
      return NextResponse.json(
        { error: "E-posta servisi yapılandırılmamış." },
        { status: 503 },
      );
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    // Body parsing
    const body = await req.json();
    const { orderId, customerName, email, type } = body;

    if (!orderId || !email || !type) {
      return NextResponse.json(
        { error: "Eksik parametreler" },
        { status: 400 },
      );
    }

    if (type === "delivered") {
      const { data, error } = await resend.emails.send({
        from: `PrestigeSO <${fromEmail}>`,
        to: [email],
        subject: "Siparişiniz Teslim Edildi 🎉 - PrestigeSO",
        react: OrderDelivered({
          orderId,
          customerName: customerName || "Müşterimiz",
        }) as ReactElement,
      });

      if (error) {
        return NextResponse.json({ error }, { status: 500 });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { error: "Geçersiz e-posta tipi" },
      { status: 400 },
    );
  } catch (error: unknown) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 500 },
    );
  }
}
