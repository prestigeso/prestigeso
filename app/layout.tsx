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
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang="tr">
      <body className={inter.className}>
        <CartProvider>
          {/* Admin değilsek müşteri araçlarını göster */}
          {!isAdmin && (
            <>
              <CampaignBanner />
              <Navbar />
            </>
          )}
          <CartSidebar />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}