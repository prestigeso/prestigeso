"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/context/CartContext";
import CartSidebar from "@/components/CartSidebar";
import CampaignBanner from "@/components/CampaignBanner";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Sadece /admin ile başlayan yollarda Navbar ve Banner'ı gizle
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang="tr">
      <body className={inter.className}>
        <CartProvider>
          {!isAdmin && <CampaignBanner />}
          {!isAdmin && <Navbar />}
          
          <CartSidebar />
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}