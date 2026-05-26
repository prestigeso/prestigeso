import {
  MAX_ADDRESS_TITLE_LENGTH,
  MAX_FULL_ADDRESS_LENGTH,
  MAX_NAME_LENGTH,
  type AddressForm,
} from "./checkoutTypes";
import { isValidEmail, isValidTurkishPhone, normalizeText } from "./checkoutFormatters";

export function validateAddressForm(data: AddressForm) {
  if (!isValidEmail(data.email)) {
    return "Lütfen geçerli bir e-posta adresi giriniz.";
  }

  if (!normalizeText(data.addressTitle)) {
    return "Adres başlığı zorunludur.";
  }

  if (normalizeText(data.addressTitle).length > MAX_ADDRESS_TITLE_LENGTH) {
    return `Adres başlığı en fazla ${MAX_ADDRESS_TITLE_LENGTH} karakter olabilir.`;
  }

  if (!normalizeText(data.firstName)) {
    return "Ad alanı zorunludur.";
  }

  if (normalizeText(data.firstName).length > MAX_NAME_LENGTH) {
    return `Ad en fazla ${MAX_NAME_LENGTH} karakter olabilir.`;
  }

  if (!normalizeText(data.lastName)) {
    return "Soyad alanı zorunludur.";
  }

  if (normalizeText(data.lastName).length > MAX_NAME_LENGTH) {
    return `Soyad en fazla ${MAX_NAME_LENGTH} karakter olabilir.`;
  }

  if (!isValidTurkishPhone(data.phone)) {
    return "Lütfen geçerli bir Türkiye telefon numarası giriniz. Örn: 05XXXXXXXXX";
  }

  if (!data.city || !data.district || !data.neighborhood) {
    return "Lütfen İl, İlçe ve Mahalle seçiniz.";
  }

  if (!normalizeText(data.fullAddress)) {
    return "Açık adres zorunludur.";
  }

  if (normalizeText(data.fullAddress).length < 10) {
    return "Açık adres en az 10 karakter olmalıdır.";
  }

  if (normalizeText(data.fullAddress).length > MAX_FULL_ADDRESS_LENGTH) {
    return `Açık adres en fazla ${MAX_FULL_ADDRESS_LENGTH} karakter olabilir.`;
  }

  return null;
}
