"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/context/CartContext";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Eğer adres /admin ile başlıyorsa isAdmin true olur
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang="tr">
      <body className={inter.className}>
        <CartProvider>
          {/* Sadece admin sayfasında değilsek Navbar'ı göster */}
          {!isAdmin && <Navbar />}
          
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}