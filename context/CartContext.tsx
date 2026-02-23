"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type CartItem = {
  id: number | string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  category?: string;
};

type CartContextType = {
  cart: CartItem[];
  items: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  toggleCart: () => void;

  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number | string) => void;
  updateQuantity: (id: number | string, amount: number) => void;

  cartTotal: number;

  campaignText: string;
  setCampaignText: (text: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [campaignText, setCampaignText] = useState("");

  useEffect(() => {
    setMounted(true);

    const savedCart = localStorage.getItem("prestigeso_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Sepet okunurken hata oluştu", e);
      }
    }

    const savedCampaign = localStorage.getItem("prestigeso_campaign") || "";
    setCampaignText(savedCampaign);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("prestigeso_cart", JSON.stringify(cart));
  }, [cart, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("prestigeso_campaign", campaignText);
  }, [campaignText, mounted]);

  const toggleCart = () => setIsCartOpen((v) => !v);

  const addToCart = (product: CartItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: number | string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: number | string, amount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQuantity = item.quantity + amount;
          return { ...item, quantity: newQuantity > 0 ? newQuantity : 1 };
        }
        return item;
      })
    );
  };

  const cartTotal = useMemo(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );

  const value: CartContextType = {
    cart,
    items: cart,
    isCartOpen,
    setIsCartOpen,
    toggleCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    cartTotal,
    campaignText,
    setCampaignText
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};