"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
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

  clearCart: () => void;

  cartTotal: number;

  campaignText: string;
  setCampaignText: (text: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function safeParseIds(ids: unknown): number[] {
  if (Array.isArray(ids)) {
    return ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  }

  if (typeof ids === "string") {
    try {
      const parsed = JSON.parse(ids);

      if (Array.isArray(parsed)) {
        return parsed.map((x) => Number(x)).filter((x) => Number.isFinite(x));
      }

      return [];
    } catch {
      return [];
    }
  }

  return [];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [campaignText, setCampaignText] = useState("");

  useEffect(() => {
    setMounted(true);

    const loadAndSyncCart = async () => {
      const savedCart = localStorage.getItem("prestigeso_cart");

      if (!savedCart) return;

      try {
        const localCart: CartItem[] = JSON.parse(savedCart);

        if (!Array.isArray(localCart)) {
          localStorage.removeItem("prestigeso_cart");
          setCart([]);
          return;
        }

        setCart(localCart);

        if (localCart.length === 0) return;

        const ids = localCart.map((item) => item.id);

        const { data: pData, error } = await supabase
          .from("products")
          .select("id, price, stock")
          .in("id", ids);

        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("*");

        const nowIso = new Date().toISOString();

        if (!pData || error) return;

        let isChanged = false;

        const availableItems = localCart.filter((item) => {
          const dbItem = pData.find((p) => String(p.id) === String(item.id));

          if (!dbItem || Number(dbItem.stock) <= 0) {
            isChanged = true;
            return false;
          }

          return true;
        });

        const syncedCart = availableItems.map((item) => {
          const dbItem = pData.find((p) => String(p.id) === String(item.id));

          if (!dbItem) {
            isChanged = true;
            return item;
          }

          const activeCamp = campaigns?.find((c: any) => {
            const campaignProductIds = safeParseIds(c.product_ids);

            return (
              campaignProductIds.includes(Number(dbItem.id)) &&
              nowIso >= c.start_date &&
              nowIso <= c.end_date
            );
          });

          const activePrice = activeCamp
            ? Number(dbItem.price) * (1 - activeCamp.discount_percent / 100)
            : Number(dbItem.price);

          const dbStock = Number(dbItem.stock || 0);
          const fixedQuantity = Math.min(Number(item.quantity || 1), dbStock);

          if (
            Number(item.price) !== Number(activePrice) ||
            Number(item.quantity) !== Number(fixedQuantity)
          ) {
            isChanged = true;

            return {
              ...item,
              price: activePrice,
              quantity: fixedQuantity > 0 ? fixedQuantity : 1,
            };
          }

          return item;
        });

        if (isChanged) {
          setCart(syncedCart);
        }
      } catch (e) {
        console.error("Sepet okunurken hata oluştu:", e);
        localStorage.removeItem("prestigeso_cart");
        setCart([]);
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

  const toggleCart = () => {
    setIsCartOpen((value) => !value);
  };

  const addToCart = (product: CartItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => String(item.id) === String(product.id)
      );

      if (existing) {
        return prev.map((item) =>
          String(item.id) === String(product.id)
            ? {
                ...item,
                quantity: Number(item.quantity || 1) + Number(product.quantity || 1),
              }
            : item
        );
      }

      return [
        ...prev,
        {
          ...product,
          quantity: Number(product.quantity || 1),
        },
      ];
    });
  };

  const removeFromCart = (id: number | string) => {
    setCart((prev) => prev.filter((item) => String(item.id) !== String(id)));
  };

  const updateQuantity = (id: number | string, amount: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (String(item.id) !== String(id)) return item;

        const newQuantity = Number(item.quantity || 1) + amount;

        return {
          ...item,
          quantity: newQuantity > 0 ? newQuantity : 1,
        };
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem("prestigeso_cart");
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      return total + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);
  }, [cart]);

  const value: CartContextType = {
    cart,
    items: cart,
    isCartOpen,
    setIsCartOpen,
    toggleCart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartTotal,
    campaignText,
    setCampaignText,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
};