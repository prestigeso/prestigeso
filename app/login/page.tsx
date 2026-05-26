"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";
import DistanceSellingContract from "@/components/contracts/DistanceSellingContract";

type AuthStep = "INIT" | "LOGIN" | "REGISTER";
type ContractModalType = "terms" | "distance" | "aydinlatma" | "privacy" | null;
type GenderValue = "" | "female" | "male" | "other" | "prefer_not_to_say";

const MAX_NAME_LENGTH = 60;
const MAX_PHONE_LENGTH = 11;

const genderOptions: { value: GenderValue; label: string }[] = [
  { value: "female", label: "Kadın" },
  { value: "male", label: "Erkek" },
  { value: "other", label: "Diğer" },
  { value: "prefer_not_to_say", label: "Belirtmek istemiyorum" },
];

const monthOptions = [
  { value: "01", label: "Ocak" },
  { value: "02", label: "Şubat" },
  { value: "03", label: "Mart" },
  { value: "04", label: "Nisan" },
  { value: "05", label: "Mayıs" },
  { value: "06", label: "Haziran" },
  { value: "07", label: "Temmuz" },
  { value: "08", label: "Ağustos" },
  { value: "09", label: "Eylül" },
  { value: "10", label: "Ekim" },
  { value: "11", label: "Kasım" },
  { value: "12", label: "Aralık" },
];

function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, MAX_PHONE_LENGTH);
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getSafeRedirectPath() {
  if (typeof window === "undefined") return "/profile";

  const redirect = new URLSearchParams(window.location.search).get("redirect") || "/profile";
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/profile";

  return redirect;
}

function getInputClass(hasError = false) {
  return `w-full p-4 bg-gray-50 border rounded-xl font-medium outline-none text-sm text-black transition-all ${
    hasError ? "border-red-500 bg-red-50/50 focus:border-red-600" : "border-gray-200 focus:border-black"
  }`;
}

function getFieldErrorClass() {
  return "text-[10px] font-black text-red-500 uppercase tracking-wide mt-1";
}

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useAppAlert();

  const [step, setStep] = useState<AuthStep>("INIT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<GenderValue>("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [activeModal, setActiveModal] = useState<ContractModalType>(null);
  const [registerAttempted, setRegisterAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const normalizedEmail = email.trim().toLowerCase();
  const cleanedFirstName = normalizeName(firstName);
  const cleanedLastName = normalizeName(lastName);
  const cleanedPhone = normalizePhone(phone);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 90 }, (_, index) => String(currentYear - index));
  }, []);

  const days = useMemo(() => {
    return Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
  }, []);

  const birthDate = birthDay && birthMonth && birthYear ? `${birthYear}-${birthMonth}-${birthDay}` : "";

  const shouldShowError = (field: string) => registerAttempted || touched[field];
  const firstNameError = shouldShowError("firstName") && !cleanedFirstName;
  const lastNameError = shouldShowError("lastName") && !cleanedLastName;
  const phoneError = shouldShowError("phone") && (cleanedPhone.length !== 11 || !cleanedPhone.startsWith("05"));
  const passwordLengthError = shouldShowError("password") && password.length > 0 && password.length < 8;
  const passwordRequiredError = registerAttempted && !password;
  const passwordConfirmError = shouldShowError("passwordConfirm") && passwordConfirm.length > 0 && password !== passwordConfirm;
  const passwordConfirmRequiredError = registerAttempted && !passwordConfirm;
  const termsError = registerAttempted && !agreedTerms;
  const privacyError = registerAttempted && !agreedPrivacy;

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const resetAuthForm = () => {
    setPassword("");
    setPasswordConfirm("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setGender("");
    setBirthDay("");
    setBirthMonth("");
    setBirthYear("");
    setAgreedTerms(false);
    setAgreedPrivacy(false);
    setRegisterAttempted(false);
    setTouched({});
    setErrorMsg("");
  };

  const handleContinue = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (error) throw error;

      resetAuthForm();
      setStep(data ? "LOGIN" : "REGISTER");
    } catch (err: any) {
      console.error("Kontrol hatası:", err?.message);
      setErrorMsg("Bir hata oluştu, lütfen tekrar deneyin.");
      showToast("Bir hata oluştu, lütfen tekrar deneyin.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      setErrorMsg("Şifre hatalı veya giriş yapılamadı.");
      showToast("Şifre hatalı veya giriş yapılamadı.", "error");
      setLoading(false);
      return;
    }

    showToast("Giriş başarılı. Yönlendiriliyorsunuz.", "success");
    router.push(getSafeRedirectPath());
    setLoading(false);
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterAttempted(true);

    if (!cleanedFirstName || !cleanedLastName) {
      showToast("Lütfen ad ve soyad bilgilerinizi giriniz.", "warning");
      return;
    }

    if (cleanedPhone.length !== 11 || !cleanedPhone.startsWith("05")) {
      showToast("Lütfen 05 ile başlayan 11 haneli geçerli bir telefon giriniz.", "warning");
      return;
    }

    if (password.length < 8) {
      showToast("Şifreniz en az 8 karakter olmalıdır.", "warning");
      return;
    }

    if (password !== passwordConfirm) {
      showToast("Şifreler eşleşmiyor. Lütfen iki şifre alanını kontrol edin.", "warning");
      return;
    }

    if (!agreedTerms) {
      showToast("Lütfen Üyelik Sözleşmesi ve Mesafeli Satış Sözleşmesi'ni onaylayınız.", "warning");
      return;
    }

    if (!agreedPrivacy) {
      showToast("Lütfen Aydınlatma Metni ve Gizlilik Politikası'nı okuyup onaylayınız.", "warning");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          first_name: cleanedFirstName,
          last_name: cleanedLastName,
          full_name: `${cleanedFirstName} ${cleanedLastName}`,
          phone: cleanedPhone,
          gender: gender || null,
          birth_date: birthDate || null,
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      showToast(error.message, "error");
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: dbError } = await supabase.from("customers").upsert(
        [
          {
            id: data.user.id,
            email: data.user.email,
            first_name: cleanedFirstName,
            last_name: cleanedLastName,
            full_name: `${cleanedFirstName} ${cleanedLastName}`,
            phone: cleanedPhone,
            gender: gender || null,
            birth_date: birthDate || null,
          },
        ],
        { onConflict: "id" }
      );

      if (dbError) {
        console.error("Müşteri tabloya eklenirken hata:", dbError);
        showToast("Üyelik oluşturuldu ancak profil bilgileri kaydedilemedi. Lütfen profilinizden kontrol edin.", "warning");
      } else {
        showToast("Üyelik başarılı. Şimdi giriş yapabilirsiniz.", "success");
      }

      setStep("LOGIN");
      setPassword("");
      setPasswordConfirm("");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center py-20 px-4 font-sans text-black">
      <div className="bg-white max-w-md w-full rounded-[2rem] p-8 md:p-12 shadow-2xl border border-gray-100 relative">
        <div className="text-center mb-10 flex flex-col items-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black">PRESTİGESO</h1>
          </Link>
          <div className="h-1 w-8 bg-black mt-2 rounded-full" />
        </div>

        {step === "INIT" && (
          <form onSubmit={handleContinue} className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-xl font-black text-center uppercase tracking-tight">Giriş Yap veya Üye Ol</h2>

            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={getInputClass(false)}
              placeholder="E-posta adresinizi giriniz"
            />

            {errorMsg && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Kontrol Ediliyor..." : "Devam Et"}
            </button>
          </form>
        )}

        {step === "LOGIN" && (
          <form onSubmit={handleLogin} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep("INIT")} type="button" className="text-black hover:-translate-x-1 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
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
              onChange={(event) => setPassword(event.target.value)}
              className={getInputClass(false)}
              placeholder="Şifrenizi giriniz"
            />

            {errorMsg && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{errorMsg}</p>}

            <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50">
              {loading ? "Bekleniyor..." : "Giriş Yap"}
            </button>
          </form>
        )}

        {step === "REGISTER" && (
          <form onSubmit={handleRegister} className="space-y-5 animate-in slide-in-from-right-4 duration-300" noValidate>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setStep("INIT")} type="button" className="text-black hover:-translate-x-1 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-xl font-black uppercase tracking-tight">Hesap Oluşturun</h2>
            </div>

            <p className="text-xs text-gray-400 font-medium italic -mt-2">Sistemde kaydınız bulunamadı, yeni üyelik oluşturuyorsunuz.</p>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-sm font-bold text-gray-500">
              <span className="truncate mr-2">{email}</span>
              <button onClick={() => setStep("INIT")} type="button" className="text-black font-black uppercase tracking-widest border-b-2 border-black flex-shrink-0 text-xs hover:text-gray-500 transition-colors">
                DÜZENLE
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  maxLength={MAX_NAME_LENGTH}
                  value={firstName}
                  onBlur={() => markTouched("firstName")}
                  onChange={(event) => setFirstName(event.target.value)}
                  className={getInputClass(firstNameError)}
                  placeholder="Adınız *"
                />
                {firstNameError && <p className={getFieldErrorClass()}>Ad alanı zorunludur.</p>}
              </div>

              <div>
                <input
                  type="text"
                  maxLength={MAX_NAME_LENGTH}
                  value={lastName}
                  onBlur={() => markTouched("lastName")}
                  onChange={(event) => setLastName(event.target.value)}
                  className={getInputClass(lastNameError)}
                  placeholder="Soyadınız *"
                />
                {lastNameError && <p className={getFieldErrorClass()}>Soyad alanı zorunludur.</p>}
              </div>
            </div>

            <div>
              <input
                type="tel"
                inputMode="tel"
                maxLength={MAX_PHONE_LENGTH}
                value={phone}
                onBlur={() => markTouched("phone")}
                onChange={(event) => setPhone(normalizePhone(event.target.value))}
                className={getInputClass(phoneError)}
                placeholder="Telefon numaranız * 05XXXXXXXXX"
              />
              {phoneError && <p className={getFieldErrorClass()}>Telefon numarası 05 ile başlayan 11 haneli olmalıdır.</p>}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cinsiyet / Hitap tercihi</p>
                <div className="grid grid-cols-2 gap-2">
                  {genderOptions.map((option) => {
                    const active = gender === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setGender(active ? "" : option.value)}
                        className={`rounded-2xl border-2 px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${
                          active ? "border-black bg-black text-white shadow-md" : "border-gray-100 bg-gray-50 text-gray-500 hover:border-black hover:text-black"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Doğum tarihi <span className="font-bold normal-case tracking-normal">(isteğe bağlı)</span></p>
                <div className="grid grid-cols-3 gap-2">
                  <select value={birthDay} onChange={(event) => setBirthDay(event.target.value)} className={getInputClass(false)}>
                    <option value="">Gün</option>
                    {days.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>

                  <select value={birthMonth} onChange={(event) => setBirthMonth(event.target.value)} className={getInputClass(false)}>
                    <option value="">Ay</option>
                    {monthOptions.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                  </select>

                  <select value={birthYear} onChange={(event) => setBirthYear(event.target.value)} className={getInputClass(false)}>
                    <option value="">Yıl</option>
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <input
                type="password"
                value={password}
                onBlur={() => markTouched("password")}
                onChange={(event) => setPassword(event.target.value)}
                className={getInputClass(passwordLengthError || passwordRequiredError)}
                placeholder="Şifre Belirleyin (Min. 8 Karakter)"
              />
              {passwordRequiredError && <p className={getFieldErrorClass()}>Şifre alanı zorunludur.</p>}
              {passwordLengthError && <p className={getFieldErrorClass()}>Şifre en az 8 karakter olmalıdır.</p>}
            </div>

            <div>
              <input
                type="password"
                value={passwordConfirm}
                onBlur={() => markTouched("passwordConfirm")}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className={getInputClass(passwordConfirmError || passwordConfirmRequiredError)}
                placeholder="Şifrenizi tekrar giriniz"
              />
              {passwordConfirmRequiredError && <p className={getFieldErrorClass()}>Şifre tekrar alanı zorunludur.</p>}
              {passwordConfirmError && <p className={getFieldErrorClass()}>Şifreler eşleşmiyor.</p>}
            </div>

            <div className="space-y-4 pt-2">
              <label className={`flex items-start gap-3 cursor-pointer group rounded-2xl p-3 border transition-all ${termsError ? "border-red-200 bg-red-50" : "border-transparent"}`}>
                <input type="checkbox" checked={agreedTerms} onChange={(event) => setAgreedTerms(event.target.checked)} className="mt-0.5 accent-black w-4 h-4 rounded border-gray-300 shrink-0" />
                <span className="text-[11px] text-gray-600 font-medium leading-tight">
                  <button type="button" onClick={(event) => { event.preventDefault(); setActiveModal("terms"); }} className="font-bold text-black underline underline-offset-2 hover:text-gray-500">Üyelik Sözleşmesi</button>{" "}
                  ve{" "}
                  <button type="button" onClick={(event) => { event.preventDefault(); setActiveModal("distance"); }} className="font-bold text-black underline underline-offset-2 hover:text-gray-500">Mesafeli Satış Sözleşmesi</button>
                  &apos;ni okudum, onaylıyorum.
                </span>
              </label>

              <label className={`flex items-start gap-3 cursor-pointer group rounded-2xl p-3 border transition-all ${privacyError ? "border-red-200 bg-red-50" : "border-transparent"}`}>
                <input type="checkbox" checked={agreedPrivacy} onChange={(event) => setAgreedPrivacy(event.target.checked)} className="mt-0.5 accent-black w-4 h-4 rounded border-gray-300 shrink-0" />
                <span className="text-[11px] text-gray-600 font-medium leading-tight">
                  Kişisel verilerimin işlenmesine yönelik{" "}
                  <button type="button" onClick={(event) => { event.preventDefault(); setActiveModal("aydinlatma"); }} className="font-bold text-black underline underline-offset-2 hover:text-gray-500">Aydınlatma Metni</button>
                  &apos;ni ve{" "}
                  <button type="button" onClick={(event) => { event.preventDefault(); setActiveModal("privacy"); }} className="font-bold text-black underline underline-offset-2 hover:text-gray-500">Gizlilik Politikası</button>
                  &apos;nı okudum.
                </span>
              </label>
            </div>

            {errorMsg && <p className="text-red-500 text-[10px] font-bold uppercase text-center">{errorMsg}</p>}

            <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 mt-4 flex justify-center items-center gap-2">
              {loading ? "Hesap Açılıyor..." : "Üye Ol 🚀"}
            </button>
          </form>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] flex flex-col relative z-10">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 shrink-0">
              <h2 className="text-lg font-black uppercase tracking-tight">
                {activeModal === "terms" && "Üyelik Sözleşmesi"}
                {activeModal === "distance" && "Mesafeli Satış Sözleşmesi"}
                {activeModal === "aydinlatma" && "Aydınlatma Metni"}
                {activeModal === "privacy" && "Gizlilik Politikası"}
              </h2>
              <button type="button" onClick={() => setActiveModal(null)} className="w-8 h-8 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors">✕</button>
            </div>

            <div className="overflow-y-auto pr-2 custom-scrollbar text-sm text-gray-600 font-medium leading-relaxed">
              {activeModal === "distance" && <DistanceSellingContract />}
              {activeModal === "terms" && (
                <div className="space-y-4">
                  <p><strong className="text-black">1. Taraflar:</strong> Bu sözleşme Prestigeso.com.tr ile üye olan kullanıcı arasındadır.</p>
                  <p><strong className="text-black">2. Üye Hesabı:</strong> Her üye sadece bir hesaba sahip olabilir. Şifre güvenliğinden üye sorumludur.</p>
                  <p><strong className="text-black">3. Sorumluluk:</strong> Site içindeki materyallerin izinsiz kullanımı yasaktır.</p>
                  <p>Daha detaylı bilgi için sitemizin en alt kısmında yer alan yasal sayfalarımızı ziyaret edebilirsiniz.</p>
                </div>
              )}
              {activeModal === "privacy" && (
                <div className="space-y-4">
                  <p><strong className="text-black">1. Topladığımız Bilgiler:</strong> Hizmet sunabilmek için kimlik, iletişim, cihaz ve çerez bilgileri toplanmaktadır.</p>
                  <p><strong className="text-black">2. Veri Güvenliği:</strong> Verileriniz ilgili mevzuatlara uygun şekilde güvenli sunucularda saklanmakta ve korunmaktadır.</p>
                  <p>Haklarınızı kullanmak için <strong className="text-black">info@prestigeso.com</strong> üzerinden bizimle iletişime geçebilirsiniz.</p>
                </div>
              )}
              {activeModal === "aydinlatma" && (
                <div className="space-y-4">
                  <p>6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca, kişisel verileriniz veri sorumlusu sıfatıyla firmamız tarafından işlenmektedir.</p>
                  <p>Kayıt esnasında alınan e-posta adresi, ad-soyad ve telefon gibi bilgileriniz, siparişlerinizin ulaştırılması ve size özel kampanyaların sunulması amacıyla kullanılmaktadır.</p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end shrink-0">
              <button type="button" onClick={() => { if (activeModal === "terms" || activeModal === "distance") setAgreedTerms(true); if (activeModal === "aydinlatma" || activeModal === "privacy") setAgreedPrivacy(true); setActiveModal(null); }} className="bg-black text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:bg-gray-900 transition-colors">
                Okudum, Onaylıyorum
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
