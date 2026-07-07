import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tüm Ürünler | PrestigeSO",
  description: "PrestigeSO'daki tüm ürünleri, özel tasarımları ve aksesuarları keşfedin.",
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
