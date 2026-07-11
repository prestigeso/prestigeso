import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: "E-posta ve kod gereklidir." }, { status: 400 });
    }

    // 1) En son gönderilen ve kullanılmamış kodu getir
    const { data: otpRow, error: otpError } = await supabaseAdmin
      .from("otp_verifications")
      .select("*")
      .eq("email", email)
      .eq("is_used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError || !otpRow) {
      return NextResponse.json({ error: "Geçerli bir doğrulama kodu bulunamadı veya daha önce kullanılmış." }, { status: 400 });
    }

    // 2) Süre kontrolü
    const expiresAt = new Date(otpRow.expires_at).getTime();
    const now = new Date().getTime();

    if (now > expiresAt) {
      return NextResponse.json({ error: "Bu kodun süresi dolmuş. Lütfen yeni bir kod isteyin." }, { status: 400 });
    }

    // 3) Kod eşleşme kontrolü
    if (otpRow.code !== code.trim()) {
      return NextResponse.json({ error: "Hatalı kod girdiniz." }, { status: 400 });
    }

    // 4) Kodu kullanıldı olarak işaretle
    await supabaseAdmin
      .from("otp_verifications")
      .update({ is_used: true })
      .eq("id", otpRow.id);

    return NextResponse.json({ success: true, message: "E-posta başarıyla doğrulandı." });
  } catch (error: any) {
    console.error("verify-otp unexpected error:", error);
    return NextResponse.json({ error: "Bilinmeyen bir hata oluştu." }, { status: 500 });
  }
}
