// app/layout.tsx
import "./globals.css";
import Navbar from "@/components/Navbar";
import { CartProvider } from "@/context/CartContext"; // Yol düzeltildi
import CartSidebar from "@/components/CartSidebar";   // Yol düzeltildi

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <CartProvider>
          <Navbar />
          <CartSidebar /> {/* Sepet her zaman hazır */}
          {children}
        </CartProvider>
      </body>
    </html>
  );
}