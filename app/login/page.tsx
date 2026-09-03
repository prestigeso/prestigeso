"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";
import AuthContractModal from "@/components/auth/AuthContractModal";
import { getErrorMessage, normalizePhone } from "@/lib/utils";
import {
  genderOptions,
  getFieldErrorClass,
  getInputClass,
  getSafeRedirectPath,
  MAX_NAME_LENGTH,
  MAX_PHONE_LENGTH,
  monthOptions,
  normalizeName,
  type AuthStep,
  type ContractModalType,
  type GenderValue,
} from "@/lib/auth/registration";

function isValidCalendarDate(value: string) {
  if (!value) return true;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= new Date()
  );
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
  const [resetSent, setResetSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<GenderValue>("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");

  const [agreedTerms, setAgreedTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [activeModal, setActiveModal] = useState<ContractModalType>(null);
  const [registerAttempted, setRegisterAttempted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const normalizedEmail = email.trim().toLowerCase();
  const cleanedFirstName = normalizeName(firstName);
  const cleanedLastName = normalizeName(lastName);
  const cleanedPhone = normalizePhone(phone);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 90 }, (_, index) =>
      String(currentYear - index),
    );
  }, []);

  const days = useMemo(() => {
    const year = Number(birthYear) || new Date().getFullYear();
    const month = Number(birthMonth) || 1;
    const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return Array.from({ length: dayCount }, (_, index) =>
      String(index + 1).padStart(2, "0"),
    );
  }, [birthMonth, birthYear]);

  const birthDate =
    birthDay && birthMonth && birthYear
      ? `${birthYear}-${birthMonth}-${birthDay}`
      : "";

  const shouldShowError = (field: string) =>
    registerAttempted || touched[field];
  const firstNameError = shouldShowError("firstName") && !cleanedFirstName;
  const lastNameError = shouldShowError("lastName") && !cleanedLastName;
  const phoneError =
    shouldShowError("phone") &&
    (cleanedPhone.length !== 11 || !cleanedPhone.startsWith("05"));
  const passwordLengthError =
    shouldShowError("password") && password.length > 0 && password.length < 8;
  const passwordRequiredError = registerAttempted && !password;
  const passwordConfirmError =
    shouldShowError("passwordConfirm") &&
    passwordConfirm.length > 0 &&
    password !== passwordConfirm;
  const passwordConfirmRequiredError = registerAttempted && !passwordConfirm;
  const termsError = registerAttempted && !agreedTerms;

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
    setMarketingConsent(false);
    setRegisterAttempted(false);
    setTouched({});
    setErrorMsg("");
  };

  const handleContinue = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg("");
    resetAuthForm();
    setStep("LOGIN");
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

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      router.push(getSafeRedirectPath());
    } else {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session) {
          subscription.unsubscribe();
          router.push(getSafeRedirectPath());
        }
      });

      setTimeout(() => {
        subscription.unsubscribe();
        router.push(getSafeRedirectPath());
      }, 3000);
    }

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
      showToast(
        "Lütfen 05 ile başlayan 11 haneli geçerli bir telefon giriniz.",
        "warning",
      );
      return;
    }

    if (password.length < 8) {
      showToast("Şifreniz en az 8 karakter olmalıdır.", "warning");
      return;
    }

    if (password !== passwordConfirm) {
      showToast(
        "Şifreler eşleşmiyor. Lütfen iki şifre alanını kontrol edin.",
        "warning",
      );
      return;
    }

    if (!agreedTerms) {
      showToast(
        "Lütfen Üyelik Sözleşmesi'ni onaylayınız.",
        "warning",
      );
      return;
    }

    if (!isValidCalendarDate(birthDate)) {
      showToast("Lütfen geçerli bir doğum tarihi seçiniz.", "warning");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, purpose: "signup" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Doğrulama kodu gönderilemedi.");
      }

      showToast("Doğrulama kodu e-postanıza gönderildi.", "success");
      setStep("OTP_VERIFICATION");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Doğrulama kodu gönderilemedi.");
      setErrorMsg(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpAndRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!otpCode) {
      showToast("Lütfen doğrulama kodunu girin.", "warning");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // 1) OTP'yi doğrula
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          code: otpCode,
          purpose: "signup",
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "Kod doğrulanamadı.");
      }

      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          firstName: cleanedFirstName,
          lastName: cleanedLastName,
          phone: cleanedPhone,
          gender: gender || null,
          birthDate: birthDate || null,
          agreedTerms,
          marketingConsent,
          verificationToken: verifyData.verificationToken,
        }),
      });
      const registerData = await registerRes.json();
      if (!registerRes.ok)
        throw new Error(registerData.error || "Kayıt tamamlanamadı.");

      showToast("Üyelik başarılı. Şimdi giriş yapabilirsiniz.", "success");
      setStep("LOGIN");
      setPassword("");
      setPasswordConfirm("");
      setOtpCode("");
    } catch (error: unknown) {
      const message = getErrorMessage(error, "Kayıt tamamlanamadı.");
      setErrorMsg(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center py-20 px-4 font-sans text-black">
      <div className="bg-white max-w-md w-full rounded-[2rem] p-8 md:p-12 shadow-2xl border border-gray-100 relative">
        <div className="text-center mb-10 flex flex-col items-center">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black">
              PRESTİGESO
            </h1>
          </Link>
          <div className="h-1 w-8 bg-black mt-2 rounded-full" />
        </div>

        {step === "INIT" && (
          <form
            onSubmit={handleContinue}
            className="space-y-6 animate-in fade-in duration-300"
          >
            <h2 className="text-xl font-black text-center uppercase tracking-tight">
              Giriş Yap veya Üye Ol
            </h2>

            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={getInputClass(false)}
              placeholder="E-posta adresinizi giriniz"
            />

            {errorMsg && (
              <p className="text-red-500 text-[10px] font-bold uppercase text-center">
                {errorMsg}
              </p>
            )}

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
          <form
            onSubmit={handleLogin}
            className="space-y-6 animate-in slide-in-from-right-4 duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setStep("INIT")}
                type="button"
                className="text-black hover:-translate-x-1 transition-transform"
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

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-sm font-bold text-gray-500">
              <span className="truncate mr-2">{email}</span>
              <button
                onClick={() => setStep("INIT")}
                type="button"
                className="text-black font-black uppercase tracking-widest border-b-2 border-black flex-shrink-0 text-xs hover:text-gray-500 transition-colors"
              >
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

            {errorMsg && (
              <p className="text-red-500 text-[10px] font-bold uppercase text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Bekleniyor..." : "Giriş Yap"}
            </button>

            <button
              type="button"
              onClick={() => {
                resetAuthForm();
                setStep("REGISTER");
              }}
              className="w-full text-center text-xs font-black text-black hover:text-gray-500 transition-colors uppercase tracking-widest"
            >
              Hesabın yok mu? Üye ol
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("FORGOT_PASSWORD");
                setErrorMsg("");
                setResetSent(false);
              }}
              className="w-full text-center text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
            >
              Şifremi Unuttum
            </button>
          </form>
        )}

        {step === "FORGOT_PASSWORD" && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setStep("LOGIN")}
                type="button"
                className="text-black hover:-translate-x-1 transition-transform"
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
                Şifremi Unuttum
              </h2>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold text-gray-500">
              <span className="truncate">{email}</span>
            </div>

            {resetSent ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                <span className="text-3xl block mb-3">✉️</span>
                <p className="text-sm font-bold text-green-800 mb-1">
                  Sıfırlama e-postası gönderildi!
                </p>
                <p className="text-xs font-medium text-green-700">
                  Lütfen e-posta kutunuzu (ve spam klasörünü) kontrol edin.
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs font-medium text-gray-500 leading-relaxed">
                  Aşağıdaki butona tıkladığınızda e-posta adresinize şifre
                  sıfırlama bağlantısı gönderilecektir.
                </p>

                {errorMsg && (
                  <p className="text-red-500 text-[10px] font-bold uppercase text-center">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    setErrorMsg("");
                    try {
                      const { error } =
                        await supabase.auth.resetPasswordForEmail(
                          normalizedEmail,
                          {
                            redirectTo: `${window.location.origin}/update-password`,
                          },
                        );
                      if (error) throw error;
                      setResetSent(true);
                      showToast(
                        "Şifre sıfırlama e-postası gönderildi.",
                        "success",
                      );
                    } catch {
                      setErrorMsg(
                        "E-posta gönderilemedi. Lütfen tekrar deneyin.",
                      );
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Gönderiliyor..." : "Sıfırlama E-postası Gönder"}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setStep("LOGIN")}
              className="w-full text-center text-xs font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest"
            >
              Giriş Yap'a Dön
            </button>
          </div>
        )}

        {step === "REGISTER" && (
          <form
            onSubmit={handleRegister}
            className="space-y-5 animate-in slide-in-from-right-4 duration-300"
            noValidate
          >
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => setStep("INIT")}
                type="button"
                className="text-black hover:-translate-x-1 transition-transform"
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

            <p className="text-xs text-gray-400 font-medium italic -mt-2">
              Sistemde kaydınız bulunamadı, yeni üyelik oluşturuyorsunuz.
            </p>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-sm font-bold text-gray-500">
              <span className="truncate mr-2">{email}</span>
              <button
                onClick={() => setStep("INIT")}
                type="button"
                className="text-black font-black uppercase tracking-widest border-b-2 border-black flex-shrink-0 text-xs hover:text-gray-500 transition-colors"
              >
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
                {firstNameError && (
                  <p className={getFieldErrorClass()}>Ad alanı zorunludur.</p>
                )}
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
                {lastNameError && (
                  <p className={getFieldErrorClass()}>
                    Soyad alanı zorunludur.
                  </p>
                )}
              </div>
            </div>

            <div>
              <input
                type="tel"
                inputMode="tel"
                maxLength={MAX_PHONE_LENGTH}
                value={phone}
                onBlur={() => markTouched("phone")}
                onChange={(event) =>
                  setPhone(normalizePhone(event.target.value))
                }
                className={getInputClass(phoneError)}
                placeholder="Telefon numaranız * 05XXXXXXXXX"
              />
              {phoneError && (
                <p className={getFieldErrorClass()}>
                  Telefon numarası 05 ile başlayan 11 haneli olmalıdır.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Cinsiyet / Hitap tercihi
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {genderOptions.map((option) => {
                    const active = gender === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setGender(active ? "" : option.value)}
                        className={`rounded-2xl border-2 px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${
                          active
                            ? "border-black bg-black text-white shadow-md"
                            : "border-gray-100 bg-gray-50 text-gray-500 hover:border-black hover:text-black"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                  Doğum tarihi{" "}
                  <span className="font-bold normal-case tracking-normal">
                    (isteğe bağlı)
                  </span>
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={birthDay}
                    onChange={(event) => setBirthDay(event.target.value)}
                    className={getInputClass(false)}
                  >
                    <option value="">Gün</option>
                    {days.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>

                  <select
                    value={birthMonth}
                    onChange={(event) => setBirthMonth(event.target.value)}
                    className={getInputClass(false)}
                  >
                    <option value="">Ay</option>
                    {monthOptions.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={birthYear}
                    onChange={(event) => setBirthYear(event.target.value)}
                    className={getInputClass(false)}
                  >
                    <option value="">Yıl</option>
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
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
                className={getInputClass(
                  passwordLengthError || passwordRequiredError,
                )}
                placeholder="Şifre Belirleyin (Min. 8 Karakter)"
              />
              {passwordRequiredError && (
                <p className={getFieldErrorClass()}>Şifre alanı zorunludur.</p>
              )}
              {passwordLengthError && (
                <p className={getFieldErrorClass()}>
                  Şifre en az 8 karakter olmalıdır.
                </p>
              )}
            </div>

            <div>
              <input
                type="password"
                value={passwordConfirm}
                onBlur={() => markTouched("passwordConfirm")}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                className={getInputClass(
                  passwordConfirmError || passwordConfirmRequiredError,
                )}
                placeholder="Şifrenizi tekrar giriniz"
              />
              {passwordConfirmRequiredError && (
                <p className={getFieldErrorClass()}>
                  Şifre tekrar alanı zorunludur.
                </p>
              )}
              {passwordConfirmError && (
                <p className={getFieldErrorClass()}>Şifreler eşleşmiyor.</p>
              )}
            </div>

            <div className="space-y-4 pt-2">
              <label
                className={`flex items-start gap-3 cursor-pointer group rounded-2xl p-3 border transition-all ${termsError ? "border-red-200 bg-red-50" : "border-transparent"}`}
              >
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(event) => setAgreedTerms(event.target.checked)}
                  className="mt-0.5 accent-black w-4 h-4 rounded border-gray-300 shrink-0"
                />
                <span className="text-[11px] text-gray-600 font-medium leading-tight">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      setActiveModal("terms");
                    }}
                    className="font-bold text-black underline underline-offset-2 hover:text-gray-500"
                  >
                    Üyelik Sözleşmesi
                  </button>
                  &apos;ni okudum ve kabul ediyorum. Mesafeli satış sözleşmesi,
                  siparişe özel bilgilerle ödeme öncesinde ayrıca sunulur.
                </span>
              </label>

              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-3 text-[11px] font-medium leading-relaxed text-gray-600">
                Üyelik sırasında kişisel verilerinizin nasıl işlendiğini{" "}
                <button
                  type="button"
                  onClick={() => setActiveModal("aydinlatma")}
                  className="font-bold text-black underline underline-offset-2 hover:text-gray-500"
                >
                  Aydınlatma Metni
                </button>{" "}
                ve{" "}
                <button
                  type="button"
                  onClick={() => setActiveModal("privacy")}
                  className="font-bold text-black underline underline-offset-2 hover:text-gray-500"
                >
                  Gizlilik Politikası
                </button>{" "}
                üzerinden inceleyebilirsiniz. Bu bilgilendirme için onay veya
                açık rıza istenmez.
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-transparent p-3 transition-all hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(event) =>
                    setMarketingConsent(event.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-black"
                />
                <span className="text-[11px] font-medium leading-tight text-gray-600">
                  İsteğe bağlı olarak e-posta ve SMS ile kampanya ve ticari
                  elektronik ileti almak istiyorum. Bu izni hesap ayarlarımdan
                  her zaman geri çekebilirim.
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
              className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 mt-4 flex justify-center items-center gap-2"
            >
              {loading ? "Hesap Açılıyor..." : "Üye Ol 🚀"}
            </button>
          </form>
        )}

        {step === "OTP_VERIFICATION" && (
          <form
            onSubmit={handleVerifyOtpAndRegister}
            className="mt-8 flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300"
          >
            <div className="text-center mb-4">
              <p className="text-sm font-medium text-gray-600">
                <span className="font-bold text-black">{normalizedEmail}</span>{" "}
                adresine 6 haneli doğrulama kodu gönderildi.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 pl-1">
                Doğrulama Kodu
              </label>
              <input
                type="text"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold text-2xl tracking-widest text-center outline-none text-black transition-all focus:border-black"
                required
              />
            </div>

            {errorMsg && (
              <p className="text-red-500 text-[10px] font-bold uppercase text-center">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 mt-4 flex justify-center items-center gap-2"
            >
              {loading ? "Doğrulanıyor..." : "Kodu Doğrula ve Üye Ol"}
            </button>

            <button
              type="button"
              onClick={() => setStep("REGISTER")}
              className="w-full py-4 text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition-colors rounded-xl border border-gray-200 hover:bg-gray-50"
            >
              Geri Dön
            </button>
          </form>
        )}
      </div>

      {activeModal && (
        <AuthContractModal
          active={activeModal}
          onClose={() => setActiveModal(null)}
          onApprove={(type) => {
            if (type === "terms" || type === "distance") setAgreedTerms(true);
            setActiveModal(null);
          }}
        />
      )}
    </div>
  );
}
