import { pageMetadata } from "@/lib/seo/pageMetadata";
import { Inter } from "next/font/google";

const adminFont = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-admin" });

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
  return <div className={adminFont.variable}>{children}</div>;
}
