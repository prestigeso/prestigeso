"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import CartSidebar from "./CartSidebar";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return (
    <>
      {!isAdmin && <Navbar />}
      {children}
      {!isAdmin && <CartSidebar />}
    </>
  );
}