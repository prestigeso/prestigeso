import { pageMetadata } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata("/update-password", "Parola Güncelleme", "PrestigeSO güvenli işlem sayfası.", true);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
