"use client";

import { useEffect } from "react";
import { useCart } from "@/context/CartContext";

export default function ClearCartOnSuccess() {
  const { clearCart, setIsCartOpen } = useCart();

  useEffect(() => {
    clearCart();
    setIsCartOpen(false);
  }, [clearCart, setIsCartOpen]);

  return null;
}
