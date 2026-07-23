import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tüm Ürünler",
  description:
    "PrestigeSO'daki tüm ürünleri, özel tasarımları ve aksesuarları keşfedin.",
  alternates: { canonical: "/shop" },
};

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
