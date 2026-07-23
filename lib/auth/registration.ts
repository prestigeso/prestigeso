export type AuthStep =
  "INIT" | "LOGIN" | "REGISTER" | "FORGOT_PASSWORD" | "OTP_VERIFICATION";

export type ContractModalType =
  "terms" | "distance" | "aydinlatma" | "privacy" | null;

export type GenderValue =
  "" | "female" | "male" | "other" | "prefer_not_to_say";

export const MAX_NAME_LENGTH = 60;
export const MAX_PHONE_LENGTH = 11;

export const genderOptions: { value: GenderValue; label: string }[] = [
  { value: "female", label: "Kadın" },
  { value: "male", label: "Erkek" },
  { value: "other", label: "Diğer" },
  { value: "prefer_not_to_say", label: "Belirtmek istemiyorum" },
];

export const monthOptions = [
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

export function normalizeName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function getSafeRedirectPath() {
  if (typeof window === "undefined") return "/profile";

  const redirect =
    new URLSearchParams(window.location.search).get("redirect") || "/profile";
  if (!redirect.startsWith("/") || redirect.startsWith("//")) return "/profile";
  return redirect;
}

export function getInputClass(hasError = false) {
  return `w-full p-4 bg-gray-50 border rounded-xl font-medium outline-none text-sm text-black transition-all ${
    hasError
      ? "border-red-500 bg-red-50/50 focus:border-red-600"
      : "border-gray-200 focus:border-black"
  }`;
}

export function getFieldErrorClass() {
  return "text-[10px] font-black text-red-500 uppercase tracking-wide mt-1";
}
