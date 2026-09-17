import { pageMetadata } from "@/lib/seo/pageMetadata";

export const metadata = pageMetadata(
  "/admin/reviews",
  "Yorum Yönetimi",
  "PrestigeSO yetkili ürün yorumu yönetimi.",
  true,
);

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
