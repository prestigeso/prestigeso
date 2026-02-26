"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

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
  
  // YENİ: clearCart tipini tanımladık
  clearCart: () => void;

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

    const loadAndSyncCart = async () => {
      const savedCart = localStorage.getItem("prestigeso_cart");
      if (savedCart) {
        try {
          const localCart: CartItem[] = JSON.parse(savedCart);
          setCart(localCart);

          if (localCart.length > 0) {
            const ids = localCart.map(item => item.id);
            // DİKKAT: Artık veritabanından 'stock' bilgisini de çekiyoruz
            const { data, error } = await supabase
              .from("products")
              .select("id, price, discount_price, stock") 
              .in("id", ids);

            if (data && !error) {
              let isChanged = false;

              // 1. ÖNCE FİLTRELE: Stoğu bitenleri (veya veritabanından silinenleri) sepetten acımadan uçur!
              const availableItems = localCart.filter(item => {
                const dbItem = data.find(p => p.id === item.id);
                // Ürün yoksa veya stoğu 0/eksi ise sepetten çöpe at
                if (!dbItem || Number(dbItem.stock) <= 0) {
                  isChanged = true;
                  return false; 
                }
                return true; 
              });

              // 2. KALANLARI GÜNCELLE: Stokta kalanların fiyatı değişmiş mi diye kontrol et
              const syncedCart = availableItems.map(item => {
                const dbItem = data.find(p => p.id === item.id);
                if (dbItem) {
                  const activePrice = Number(dbItem.discount_price) > 0 
                    ? Number(dbItem.discount_price) 
                    : Number(dbItem.price);

                  if (item.price !== activePrice) {
                    isChanged = true;
                    return { ...item, price: activePrice };
                  }
                }
                return item;
              });

              // Eğer stoktan silinen veya fiyatı değişen varsa Context'i (Ekrani) anında güncelle
              if (isChanged) {
                setCart(syncedCart);
              }
            }
          }
        } catch (e) {
          console.error("Sepet okunurken hata oluştu", e);
        }
      }
    };

    loadAndSyncCart();

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

  // YENİ VE DÜZELTİLMİŞ: Sepeti Temizleme Motoru
  const clearCart = () => {
    setCart([]); // setItems değil, setCart kullanıyoruz!
    localStorage.removeItem("prestigeso_cart"); 
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
    clearCart, // Dışarı aktardık!
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