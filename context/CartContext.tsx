// context/CartContext.tsx
"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Ürün Tipi
export type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

// Context Tipi
type CartContextType = {
  items: Product[];
  addToCart: (product: any) => void;
  removeFromCart: (id: number) => void;
  toggleCart: () => void;
  isCartOpen: boolean;
  cartTotal: number;
  // --- YENİ EKLENEN KISIM ---
  campaignText: string;
  updateCampaignText: (text: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Varsayılan Kampanya Metni
  const [campaignText, setCampaignText] = useState("🚚 500 TL VE ÜZERİ KARGO BEDAVA! 🔥 SEZON İNDİRİMLERİ BAŞLADI");

  // Sayfa açılınca hafızadan (localStorage) oku
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    const savedText = localStorage.getItem("campaignText");
    
    if (savedCart) setItems(JSON.parse(savedCart));
    if (savedText) setCampaignText(savedText);
  }, []);

  // Değişiklik olunca hafızaya kaydet
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items));
  }, [items]);

  const updateCampaignText = (text: string) => {
    setCampaignText(text);
    localStorage.setItem("campaignText", text); // Yazıyı kaydet
  };

  const addToCart = (product: any) => {
    setItems((prev) => {
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

  const removeFromCart = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleCart = () => setIsCartOpen(!isCartOpen);

  const cartTotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, toggleCart, isCartOpen, cartTotal, campaignText, updateCampaignText }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}