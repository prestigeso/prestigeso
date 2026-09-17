import { pageMetadata } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata(
  "/admin/analysis",
  "Mağaza Analizi",
  "PrestigeSO yetkili mağaza analiz alanı.",
  true,
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
