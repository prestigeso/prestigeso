import { MAX_EMAIL_LENGTH, MAX_PHONE_LENGTH } from "./checkoutTypes";

export function normalizeText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function normalizeEmail(value: string) {
  return normalizeText(value).toLowerCase();
}

export function normalizePhone(value: string) {
  return String(value || "").replace(/[^0-9+]/g, "").slice(0, MAX_PHONE_LENGTH);
}

export function normalizeCouponCode(value: string) {
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 40);
}

export function formatMoney(value: unknown) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function isValidEmail(value: string) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= MAX_EMAIL_LENGTH;
}

export function isValidTurkishPhone(value: string) {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(05\d{9}|5\d{9}|90\d{10})$/.test(digits);
}
