import type { Metadata } from "next";

export const publicContentPages = {
  "/hakkimizda": ["Hakkımızda", "PrestigeSO markası ve mağazamız hakkında bilgi alın."],
  "/iletisim": ["İletişim", "PrestigeSO iletişim bilgileri ve destek kanalları."],
  "/teslimat-bilgileri": ["Teslimat Bilgileri", "Sipariş hazırlığı ve teslimat koşulları hakkında bilgi alın."],
  "/guvenlik-ve-iade": ["Güvenlik ve İade", "Güvenli alışveriş, iptal ve iade süreçleri."],
  "/gizlilik-politikasi": ["Gizlilik Politikası", "PrestigeSO gizlilik ve kişisel veri işleme politikası."],
  "/gizlilik-ilkeleri": ["Gizlilik İlkeleri", "PrestigeSO gizlilik ilkeleri ve veri güvenliği yaklaşımı."],
  "/kvkk": ["KVKK Aydınlatma Metni", "PrestigeSO kişisel verilerin korunması aydınlatma metni."],
  "/uyelik-sozlesmesi": ["Üyelik Sözleşmesi", "PrestigeSO üyelik koşulları ve kullanıcı sözleşmesi."],
  "/mesafeli-satis-sozlesmesi": ["Mesafeli Satış Sözleşmesi", "PrestigeSO mesafeli satış ve ön bilgilendirme koşulları."],
} as const;

export function pageMetadata(path: string, title: string, description: string, privatePage = false): Metadata {
  return {
    title, description, alternates: { canonical: path },
    robots: { index: !privatePage, follow: !privatePage },
    ...(privatePage ? { referrer: "no-referrer" as const } : {}),
    openGraph: { title, description, url: path, siteName: "PrestigeSO", locale: "tr_TR", type: "website" },
    twitter: { card: "summary", title, description },
  };
}
