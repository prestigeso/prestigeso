import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { CartProvider } from "@/context/CartContext";
import { SearchProvider } from "@/context/SearchContext";
// 🟢 Akıllı Sarıcımızı çağırdık
import ConditionalLayout from "@/components/ConditionalUI"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrestigeSO | Tarzını Yeniden Keşfet",
  description: "Sezonun en trend parçaları burada.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <SearchProvider>
          <CartProvider>
            {/* 🟢 Bütün sistemi akıllı sarıcımızın içine aldık */}
            <ConditionalLayout>
              {children}
            </ConditionalLayout>
          </CartProvider>
        </SearchProvider>
      </body>
    </html>
  );
}