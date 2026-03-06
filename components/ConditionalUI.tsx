"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import CartSidebar from "./CartSidebar";
import Footer from "./Footer"; // İŞTE FOOTER'I BURAYA ÇAĞIRDIK!

export default function ConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // 1. Admin sayfasındaysa menü, sepet ve footer gizlenir.
  const isAdmin = pathname?.startsWith("/admin");
  
  // 2. Kasa (Checkout) ve Giriş (Login) sayfalarında müşterinin odağını dağıtmamak için Footer gizlenir.
  const hideFooter = isAdmin || pathname?.startsWith("/checkout") || pathname?.startsWith("/login");

  return (
    // flex ve min-h-screen: Sayfa içeriği az olsa bile Footer'ı her zaman en aşağıya iter!
    <div className="flex flex-col min-h-screen">
      
      {!isAdmin && <Navbar />}
      
      {/* flex-grow: İçeriğin uzayabileceği kadar uzamasını sağlar */}
      <main className="flex-grow">
        {children}
      </main>
      
      {!isAdmin && <CartSidebar />}
      
      {/* Sadece uygun sayfalarda Footer'ı göster */}
      {!hideFooter && <Footer />}
      
    </div>
  );
}