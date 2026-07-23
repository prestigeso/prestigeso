"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";

export default function ClearCartOnSuccess({
  confirmed,
}: {
  confirmed: boolean;
}) {
  const { clearCart, setIsCartOpen } = useCart();
  const didRunRef = useRef(false);

  useEffect(() => {
    if (!confirmed) return;
    if (didRunRef.current) return;
    didRunRef.current = true;

    // Eğer sayfa PayTR iFrame'i içinde açıldıysa, ebeveyn sayfayı yönlendir
    if (window.top && window.top !== window.self) {
      window.top.location.href = window.location.href;
      return;
    }

    setIsCartOpen(false);
    clearCart();
  }, [clearCart, confirmed, setIsCartOpen]);

  return null;
}
