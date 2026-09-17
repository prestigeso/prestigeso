import { pageMetadata } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/odeme/basarili", "Ödeme Sonucu", "PrestigeSO güvenli işlem sayfası.", true);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
