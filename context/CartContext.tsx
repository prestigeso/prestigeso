"use client";

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase"; // EKLENDİ: Supabase bağlantısı

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

    // JİLET GİBİ SENKRONİZASYON FONKSİYONU
    const loadAndSyncCart = async () => {
      const savedCart = localStorage.getItem("prestigeso_cart");
      if (savedCart) {
        try {
          const localCart: CartItem[] = JSON.parse(savedCart);
          
          // 1. Önce adamın hafızasındaki sepeti ekrana veriyoruz ki beklemesin
          setCart(localCart);

          // 2. Arka planda ajan gibi Supabase'e gidip güncel fiyatları kontrol ediyoruz
          if (localCart.length > 0) {
            const ids = localCart.map(item => item.id);
            const { data, error } = await supabase
              .from("products")
              .select("id, price, discount_price")
              .in("id", ids);

            if (data && !error) {
              let isChanged = false;

              const syncedCart = localCart.map(item => {
                const dbItem = data.find(p => p.id === item.id);
                
                if (dbItem) {
                  // Kampanya/İndirim varsa onu, yoksa normal fiyatı baz al
                  const activePrice = Number(dbItem.discount_price) > 0 
                    ? Number(dbItem.discount_price) 
                    : Number(dbItem.price);

                  // Eğer fiyat değişmişse (Zam veya indirim gelmişse) sepeti güncelle
                  if (item.price !== activePrice) {
                    isChanged = true;
                    return { ...item, price: activePrice };
                  }
                }
                return item;
              });

              // Eğer fiyatlarda değişim yakaladıysak, sepet state'ini güncelliyoruz
              if (isChanged) {
                setCart(syncedCart);
                // Opsiyonel: Müşteriye uyarı da verebilirsin
                console.log("Sepetteki ürünlerin fiyatı güncel piyasaya göre senkronize edildi!");
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