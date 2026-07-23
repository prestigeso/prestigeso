import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 2000;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const name = String(body.name || "")
      .trim()
      .slice(0, MAX_NAME_LENGTH);
    const email = String(body.email || "")
      .trim()
      .slice(0, MAX_EMAIL_LENGTH)
      .toLowerCase();
    const subject = String(body.subject || "")
      .trim()
      .slice(0, MAX_SUBJECT_LENGTH);
    const message = String(body.message || "")
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Ad, e-posta ve mesaj alanları zorunludur." },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Geçerli bir e-posta adresi giriniz." },
        { status: 400 },
      );
    }

    const limit = await consumeRateLimit({
      bucket: "contact-ip",
      identifier: getClientIp(req),
      maxRequests: 5,
      windowSeconds: 3600,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error:
            "Çok fazla mesaj gönderildi. Lütfen daha sonra tekrar deneyin.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    const { error } = await supabaseAdmin.from("contact_messages").insert([
      {
        name,
        email,
        subject: subject || null,
        message,
      },
    ]);

    if (error) {
      console.error("İletişim mesajı kaydedilemedi:", error.message);
      return NextResponse.json(
        { error: "Mesajınız gönderilemedi. Lütfen daha sonra tekrar deneyin." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("İletişim API hatası:", err);
    return NextResponse.json(
      { error: "Beklenmeyen bir hata oluştu." },
      { status: 500 },
    );
  }
}
