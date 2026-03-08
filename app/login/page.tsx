"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import DistanceSellingContract from "@/components/contracts/DistanceSellingContract";
import MembershipAgreement from "@/components/contracts/MembershipAgreement";
import PrivacyPolicy from "@/components/contracts/PrivacyPolicy";
import ClarificationText from "@/components/contracts/ClarificationText";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"INIT" | "LOGIN" | "REGISTER">("INIT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // YENİ NESİL POPUP VE CHECKBOX YÖNETİMİ (Sadece REGISTER adımında çalışır)
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // ZEKİ KONTROL MOTORU: Kullanıcı kayıtlı mı değil mi bakıyoruz
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStep("LOGIN");
      } else {
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
    
    // GÜVENLİK ZIRHI: Onaylar tam mı?
    if (!agreedTerms) {
      return alert("Lütfen Üyelik Sözleşmesi ve Mesafeli Satış Sözleşmesi'ni onaylayınız.");
    }
    if (!agreedPrivacy) {
      return alert("Lütfen Aydınlatma Metni ve Gizlilik Politikası'nı okuyup onaylayınız.");
    }
    if (password.length < 8) {
      return alert("Şifreniz en az 8 karakter olmalıdır.");
    }

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
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center py-20 px-4 font-sans text-black">
      <div className="bg-white max-w-md w-full rounded-[2rem] p-8 md:p-12 shadow-2xl border border-gray-100 relative">
        
        {/* LOGO */}
        <div className="text-center mb-10 flex flex-col items-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black">
              PRESTİGESO
            </h1>
          </Link>
          <div className="h-1 w-8 bg-black mt-2 rounded-full"></div>
        </div>

        {/* STEP 1: E-POSTA GİRİŞİ */}
        {step === "INIT" && (
          <form onSubmit={handleContinue} className="space-y-6 animate-in fade-in duration-300">
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
            {errorMsg && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{errorMsg}</p>}
            <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50">
              {loading ? "Kontrol Ediliyor..." : "Devam Et"}
            </button>
          </form>
        )}

        {/* STEP 2: GİRİŞ YAP */}
        {step === "LOGIN" && (
          <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep("INIT")} type="button" className="text-black hover:-translate-x-1 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="text-xl font-black uppercase tracking-tight">Giriş Yap</h2>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-sm font-bold text-gray-500">
              <span className="truncate mr-2">{email}</span>
              <button onClick={() => setStep("INIT")} type="button" className="text-black font-black uppercase tracking-widest border-b-2 border-black flex-shrink-0 text-xs hover:text-gray-500 transition-colors">
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

            {errorMsg && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{errorMsg}</p>}

            <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50">
              {loading ? "Bekleniyor..." : "Giriş Yap"}
            </button>
          </form>
        )}

        {/* STEP 3: HESAP OLUŞTUR (YENİ SÖZLEŞMELİ YAPI) */}
        {step === "REGISTER" && (
          <form onSubmit={handleRegister} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep("INIT")} type="button" className="text-black hover:-translate-x-1 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="text-xl font-black uppercase tracking-tight">Hesap Oluşturun</h2>
            </div>

            <p className="text-xs text-gray-400 font-medium italic -mt-2">
              Sistemde kaydınız bulunamadı, yeni üyelik oluşturuyorsunuz.
            </p>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-sm font-bold text-gray-500">
              <span className="truncate mr-2">{email}</span>
              <button onClick={() => setStep("INIT")} type="button" className="text-black font-black uppercase tracking-widest border-b-2 border-black flex-shrink-0 text-xs hover:text-gray-500 transition-colors">
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

            {/* SÖZLEŞME ONAYLARI (FOTOĞRAFTAKİ YAPI) */}
            <div className="space-y-4 pt-2">
              {/* Checkbox 1: Kullanım/Üyelik ve Mesafeli Satış */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 accent-black w-4 h-4 rounded border-gray-300 shrink-0" 
                />
                <span className="text-[11px] text-gray-600 font-medium leading-tight">
                  <button type="button" onClick={(e) => { e.preventDefault(); setActiveModal('terms'); }} className="font-bold text-black underline underline-offset-2 hover:text-gray-500">Üyelik Sözleşmesi</button>
                  {' '}ve{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setActiveModal('distance'); }} className="font-bold text-black underline underline-offset-2 hover:text-gray-500">Mesafeli Satış Sözleşmesi</button>
                  'ni okudum, onaylıyorum.
                </span>
              </label>

              {/* Checkbox 2: Aydınlatma ve Gizlilik */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={agreedPrivacy}
                  onChange={(e) => setAgreedPrivacy(e.target.checked)}
                  className="mt-0.5 accent-black w-4 h-4 rounded border-gray-300 shrink-0" 
                />
                <span className="text-[11px] text-gray-600 font-medium leading-tight">
                  Kişisel verilerimin işlenmesine yönelik{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setActiveModal('aydinlatma'); }} className="font-bold text-black underline underline-offset-2 hover:text-gray-500">Aydınlatma Metni</button>
                  'ni ve{' '}
                  <button type="button" onClick={(e) => { e.preventDefault(); setActiveModal('privacy'); }} className="font-bold text-black underline underline-offset-2 hover:text-gray-500">Gizlilik Politikası</button>
                  'nı okudum.
                </span>
              </label>
            </div>

            {errorMsg && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading || !agreedTerms || !agreedPrivacy || password.length < 8}
              className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 mt-4 flex justify-center items-center gap-2"
            >
              {loading ? "Hesap Açılıyor..." : "Üye Ol 🚀"}
            </button>
          </form>
        )}
      </div>

      {/* ========================================== */}
      {/* SÖZLEŞME POPUP (MODAL) YÖNETİMİ            */}
      {/* ========================================== */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] flex flex-col relative z-10">
            
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <h2 className="text-lg font-black uppercase tracking-tight">
                {activeModal === 'terms' && "Üyelik Sözleşmesi"}
                {activeModal === 'distance' && "Mesafeli Satış Sözleşmesi"}
                {activeModal === 'aydinlatma' && "Aydınlatma Metni"}
                {activeModal === 'privacy' && "Gizlilik Politikası"}
              </h2>
              <button onClick={() => setActiveModal(null)} className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors">✕</button>
            </div>
            
            <div className="overflow-y-auto pr-2 custom-scrollbar text-sm text-gray-600 font-medium leading-relaxed">
              
              {/* MESAFELİ SATIŞ SÖZLEŞMESİ (Bileşeni Çağırıyoruz) */}
              {activeModal === 'distance' && (
                <DistanceSellingContract /> 
              )}

              {/* ÜYELİK SÖZLEŞMESİ KISA ÖZET */}
              {activeModal === 'terms' && (
                <div className="space-y-4">
                  <p><strong className="text-black">1. Taraflar:</strong> Bu sözleşme Prestigeso.com.tr ile üye olan kullanıcı arasındadır.</p>
                  <p><strong className="text-black">2. Üye Hesabı:</strong> Her üye sadece bir hesaba sahip olabilir. Şifre güvenliğinden üye sorumludur.</p>
                  <p><strong className="text-black">3. Sorumluluk:</strong> Site içindeki materyallerin izinsiz kullanımı yasaktır.</p>
                  <p>Daha detaylı bilgi için sitemizin en alt kısmında (Footer) yer alan yasal sayfalarımızı ziyaret edebilirsiniz.</p>
                </div>
              )}

              {/* GİZLİLİK POLİTİKASI KISA ÖZET */}
              {activeModal === 'privacy' && (
                <div className="space-y-4">
                  <p><strong className="text-black">1. Topladığımız Bilgiler:</strong> Hizmet sunabilmek için kimlik, iletişim, cihaz ve çerez bilgileri toplanmaktadır.</p>
                  <p><strong className="text-black">2. Veri Güvenliği:</strong> Verileriniz ilgili mevzuatlara uygun şekilde güvenli sunucularda saklanmakta ve korunmaktadır.</p>
                  <p>Haklarınızı kullanmak için <strong className="text-black">info@prestigeso.com</strong> üzerinden bizimle iletişime geçebilirsiniz.</p>
                </div>
              )}

              {/* AYDINLATMA METNİ KISA ÖZET */}
              {activeModal === 'aydinlatma' && (
                <div className="space-y-4">
                  <p>6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla firmamız tarafından işlenmektedir.</p>
                  <p>Kayıt esnasında alınan e-posta adresi, ad-soyad gibi bilgileriniz, siparişlerinizin ulaştırılması ve size özel kampanyaların sunulması amacıyla kullanılmaktadır.</p>
                </div>
              )}

            </div>

            {/* Modal Altı Kabul Butonu */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end shrink-0">
              <button 
                onClick={() => {
                  if(activeModal === 'terms' || activeModal === 'distance') setAgreedTerms(true);
                  if(activeModal === 'aydinlatma' || activeModal === 'privacy') setAgreedPrivacy(true);
                  setActiveModal(null);
                }} 
                className="bg-black text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:bg-gray-900 transition-colors"
              >
                Okudum, Onaylıyorum
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}