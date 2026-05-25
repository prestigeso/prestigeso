
"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";

export default function ClearCartOnSuccess() {
  const { clearCart, setIsCartOpen } = useCart();
  const didRunRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    setIsCartOpen(false);

    window.setTimeout(() => {
      clearCart();
      setIsCartOpen(false);
    }, 0);
  }, [clearCart, setIsCartOpen]);

  return null;
}
