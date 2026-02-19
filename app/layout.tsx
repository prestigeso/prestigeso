"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import CampaignBanner from "@/components/CampaignBanner"; // Bunu silmiştik, geri geldi!
import { CartProvider } from "@/context/CartContext";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang="tr">
      <body className={inter.className}>
        <CartProvider>
          {/* Admin değilsek hem kayan yazıyı hem menüyü göster */}
          {!isAdmin && <CampaignBanner />}
          {!isAdmin && <Navbar />}
          
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}