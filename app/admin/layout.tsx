import { pageMetadata } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata(
  "/admin",
  "Mağaza Yönetimi",
  "PrestigeSO yetkili yönetim alanı.",
  true,
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
