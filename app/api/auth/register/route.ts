import { NextRequest, NextResponse } from "next/server";
import {
  consumeOtpProof,
  verifyOtpProof,
  normalizeOtpEmail,
} from "@/lib/otpProof";
import { consumeRateLimit, getClientIp } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidTurkishPhone, normalizePhone } from "@/lib/utils";

export const runtime = "nodejs";

const GENDERS = new Set(["female", "male", "other", "prefer_not_to_say"]);

function cleanName(value: unknown) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 60);
}

function validBirthDate(value: unknown) {
  const text = String(value || "");
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text)
    return false;
  const today = new Date();
  return date <= today ? text : false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeOtpEmail(body.email);
    const password = String(body.password || "");
    const firstName = cleanName(body.firstName);
    const lastName = cleanName(body.lastName);
    const phone = normalizePhone(body.phone);
    const gender = GENDERS.has(String(body.gender)) ? String(body.gender) : null;
    const birthDate = validBirthDate(body.birthDate);

    if (
      !email ||
      password.length < 8 ||
      password.length > 128 ||
      !firstName ||
      !lastName ||
      !isValidTurkishPhone(phone) ||
      birthDate === false ||
      body.agreedTerms !== true ||
      body.agreedPrivacy !== true ||
      !verifyOtpProof(body.verificationToken, email, "signup")
    ) {
      return NextResponse.json(
        { error: "Kayıt bilgileri veya doğrulama kanıtı geçersiz." },
        { status: 400 },
      );
    }

    const limit = await consumeRateLimit({
      bucket: "registration-ip",
      identifier: getClientIp(req),
      maxRequests: 8,
      windowSeconds: 3600,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Çok fazla kayıt denemesi yapıldı." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    }

    if (!(await consumeOtpProof(body.verificationToken, email, "signup"))) {
      return NextResponse.json(
        {
          error:
            "E-posta doğrulaması daha önce kullanılmış veya süresi dolmuş.",
        },
        { status: 409 },
      );
    }

    const fullName = `${firstName} ${lastName}`;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone,
        gender,
        birth_date: birthDate,
      },
    });

    if (error || !data.user) {
      const duplicate = /already|registered|exists/i.test(error?.message || "");
      return NextResponse.json(
        {
          error: duplicate
            ? "Bu e-posta ile giriş yapmayı veya şifre sıfırlamayı deneyin."
            : "Üyelik oluşturulamadı.",
        },
        { status: duplicate ? 409 : 500 },
      );
    }

    const { error: profileError } = await supabaseAdmin.from("customers").insert({
      id: data.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      phone,
      gender,
      birth_date: birthDate,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json(
        { error: "Profil oluşturulamadığı için üyelik geri alındı." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Kayıt tamamlanamadı." }, { status: 500 });
  }
}
