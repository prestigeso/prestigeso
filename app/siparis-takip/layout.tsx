import { pageMetadata } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/siparis-takip", "Sipariş Takibi", "PrestigeSO güvenli işlem sayfası.", true);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
