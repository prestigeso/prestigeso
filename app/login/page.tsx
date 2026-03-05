"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"INIT" | "LOGIN" | "REGISTER">("INIT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ZEKİ KONTROL MOTORU: Kullanıcı kayıtlı mı değil mi bakıyoruz
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. ADIM: 'customers' tablosunda bu mail adresi var mı diye bakıyoruz
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle(); // Eğer yoksa hata fırlatmaz, null döner

      if (error) throw error;

      if (data) {
        // Müşteri bulundu! Şifre ekranına (LOGIN) gönderiyoruz.
        setStep("LOGIN");
      } else {
        // Müşteri bulunamadı. Yeni kayıt (REGISTER) ekranına gönderiyoruz.
        setStep("REGISTER");
      }
    } catch (err: any) {
      console.error("Kontrol hatası:", err?.message);
      setErrorMsg("Bir hata oluştu, lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg("Şifre hatalı veya giriş yapılamadı.");
    } else {
      router.push("/profile");
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setErrorMsg(error.message);
    } else if (data.user) {
      const { error: dbError } = await supabase.from("customers").insert([
        {
          id: data.user.id,
          email: data.user.email,
        },
      ]);

      if (dbError) {
        console.error("Müşteri tabloya eklenirken hata:", dbError);
      }

      alert("Üyelik başarılı! Şimdi asilce giriş yapabilirsiniz.");
      setStep("LOGIN");
      setPassword("");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center py-20 px-4 mt-10 font-sans">
      <div className="bg-white max-w-md w-full rounded-3xl p-8 md:p-12 shadow-[0_10px_50px_rgba(0,0,0,0.08)] border border-gray-100 relative">
        {/* LOGO */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-black uppercase tracking-widest text-black">
              PRESTİGESO
            </h1>
          </Link>
          <div className="h-1 w-10 bg-black mx-auto mt-2"></div>
        </div>

        {/* STEP 1: E-POSTA GİRİŞİ */}
        {step === "INIT" && (
          <form
            onSubmit={handleContinue}
            className="space-y-6 animate-in fade-in duration-300"
          >
            <h2 className="text-xl font-black text-center uppercase tracking-tight">
              Giriş Yap veya Üye Ol
            </h2>

            <div className="space-y-1">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none text-sm text-black focus:border-black transition-all"
                placeholder="E-posta adresinizi giriniz"
              />
            </div>

            {errorMsg && (
              <p className="text-red-500 text-[10px] font-bold uppercase text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-lg hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              {loading ? "Kontrol Ediliyor..." : "Devam Et"}
            </button>
          </form>
        )}

        {/* STEP 2: GİRİŞ YAP */}
        {step === "LOGIN" && (
          <form
            onSubmit={handleLogin}
            className="space-y-6 animate-in slide-in-from-right-5 duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setStep("INIT")}
                type="button"
                className="text-black hover:scale-110 transition-transform"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="w-6 h-6"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-black uppercase tracking-tight">
                Giriş Yap
              </h2>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs font-bold text-gray-500">
              <span className="truncate mr-2">{email}</span>
              <button
                onClick={() => setStep("INIT")}
                type="button"
                className="text-black font-black uppercase tracking-widest border-b border-black flex-shrink-0"
              >
                DÜZENLE
              </button>
            </div>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none text-sm text-black focus:border-black transition-all"
              placeholder="Şifrenizi giriniz"
            />

            {errorMsg && (
              <p className="text-red-500 text-[10px] font-bold uppercase text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-gray-800 transition-all"
            >
              {loading ? "Bekleniyor..." : "Giriş Yap"}
            </button>
          </form>
        )}

        {/* STEP 3: HESAP OLUŞTUR */}
        {step === "REGISTER" && (
          <form
            onSubmit={handleRegister}
            className="space-y-6 animate-in slide-in-from-bottom-5 duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setStep("INIT")}
                type="button"
                className="text-black hover:scale-110 transition-transform"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="w-6 h-6"
                >
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-black uppercase tracking-tight">
                Hesap Oluşturun
              </h2>
            </div>

            <p className="text-[11px] text-gray-400 font-medium italic">
              Sistemde kaydınız bulunamadı, yeni üyelik oluşturuyorsunuz.
            </p>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-xs font-bold text-gray-500">
              <span className="truncate mr-2">{email}</span>
              <button
                onClick={() => setStep("INIT")}
                type="button"
                className="text-black font-black uppercase tracking-widest border-b border-black flex-shrink-0"
              >
                DÜZENLE
              </button>
            </div>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none text-sm text-black focus:border-black transition-all"
              placeholder="Şifre Belirleyin (Min. 8 Karakter)"
            />

            <div className="space-y-4 pt-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  className="mt-1 accent-black w-4 h-4 rounded border-gray-300"
                />
                <span className="text-[10px] text-gray-500 font-medium leading-tight">
                  <span className="underline font-bold text-black">
                    Kullanım Koşulları
                  </span>{" "}
                  ve{" "}
                  <span className="underline font-bold text-black">
                    Mesafeli Satış Sözleşmesi
                  </span>
                  'ni okudum, onaylıyorum.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  required
                  className="mt-1 accent-black w-4 h-4 rounded border-gray-300"
                />
                <span className="text-[10px] text-gray-500 font-medium leading-tight">
                  Kişisel verilerimin işlenmesine yönelik{" "}
                  <span className="underline font-bold text-black">
                    Aydınlatma Metni
                  </span>
                  'ni ve{" "}
                  <span className="underline font-bold text-black">
                    Gizlilik Politikası
                  </span>
                  'nı okudum.
                </span>
              </label>
            </div>

            {errorMsg && (
              <p className="text-red-500 text-[10px] font-bold uppercase text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:bg-gray-800 transition-all"
            >
              {loading ? "Hesap Açılıyor..." : "Üye Ol 🚀"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}