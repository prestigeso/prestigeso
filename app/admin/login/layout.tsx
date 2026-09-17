import { pageMetadata } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata(
  "/admin/login",
  "Yönetici Girişi",
  "PrestigeSO yetkili yönetici girişi.",
  true,
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
