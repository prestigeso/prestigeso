import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { CartProvider } from "@/context/CartContext";
import { SearchProvider } from "@/context/SearchContext";
import CartDrawer from "@/components/CartDrawer";
import Navbar from "@/components/Navbar"; // Navbar'ın tam adı veya yolu farklıysa burayı kendi yoluna göre düzelt

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
            <Navbar />
            {children}
            <CartDrawer />
          </CartProvider>
        </SearchProvider>
      </body>
    </html>
  );
}