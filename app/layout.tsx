// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer"; // Footer varsa
import { CartProvider } from "@/context/CartContext";
import CartSidebar from "@/components/CartSidebar";
import CampaignBanner from "@/components/CampaignBanner"; // Kampanya bandını ekledik

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrestigeSO",
  description: "Tarzını Yeniden Keşfet",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        <CartProvider>
          {/* 1. En Üstte Kampanya Bandı */}
          <CampaignBanner />
          
          {/* 2. Sonra Navbar */}
          <Navbar />
          
          {/* 3. Gizli Sepet Penceresi */}
          <CartSidebar />
          
          {/* 4. Sayfa İçeriği */}
          {children}

          {/* 5. En Altta Footer (Varsa) */}
          <Footer /> 
        </CartProvider>
      </body>
    </html>
  );
}