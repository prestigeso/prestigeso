import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { OtpEmail } from "@/components/emails/OtpEmail";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || "info@prestigeso.com.tr";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Geçerli bir e-posta adresi giriniz." }, { status: 400 });
    }

    // Rate limiting: aynı maile son 1 dakikada kod gitmiş mi?
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentOtp } = await supabaseAdmin
      .from("otp_verifications")
      .select("id")
      .eq("email", email)
      .gte("created_at", oneMinuteAgo)
      .maybeSingle();

    if (recentOtp) {
      return NextResponse.json({ error: "Lütfen yeni bir kod istemeden önce 1 dakika bekleyin." }, { status: 429 });
    }

    const code = generateOtp();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // 3 dakika geçerli

    const { error: dbError } = await supabaseAdmin
      .from("otp_verifications")
      .insert([
        {
          email,
          code,
          expires_at: expiresAt,
          is_used: false
        }
      ]);

    if (dbError) {
      console.error("OTP insert error:", dbError);
      return NextResponse.json({ error: "Kod oluşturulamadı, veritabanı hatası." }, { status: 500 });
    }

    const { error: emailError } = await resend.emails.send({
      from: `PrestigeSO <${fromEmail}>`,
      to: [email],
      subject: `${code} - Doğrulama Kodunuz`,
      react: OtpEmail({ code }),
    });

    if (emailError) {
      console.error("OTP send error:", emailError);
      return NextResponse.json({ error: "E-posta gönderilemedi." }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Doğrulama kodu gönderildi." });
  } catch (error: any) {
    console.error("send-otp unexpected error:", error);
    return NextResponse.json({ error: "Bilinmeyen bir hata oluştu." }, { status: 500 });
  }
}
