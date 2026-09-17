import { pageMetadata } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/odeme/basarisiz", "Ödeme Sonucu", "PrestigeSO güvenli işlem sayfası.", true);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
