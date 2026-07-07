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
import { safeParseIds } from "@/lib/utils";

export type CartItem = {
  id: number | string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  category?: string;
  stock?: number;
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
        const parsed = JSON.parse(savedCart);

        if (!Array.isArray(parsed)) {
          localStorage.removeItem("prestigeso_cart");
          setCart([]);
          return;
        }

        // SEC-17: localStorage verileri doğrula — XSS ile zehirlenmiş elemanları filtrele
        const localCart: CartItem[] = parsed.filter((item: any) =>
          item &&
          typeof item === "object" &&
          (typeof item.id === "number" || typeof item.id === "string") &&
          typeof item.name === "string" &&
          Number.isFinite(Number(item.price)) &&
          Number.isFinite(Number(item.quantity)) &&
          Number(item.quantity) > 0
        ).map((item: any) => ({
          ...item,
          id: typeof item.id === "number" ? item.id : Number(item.id),
          name: String(item.name).slice(0, 200),
          price: Number(item.price),
          quantity: Math.min(Math.max(1, Math.floor(Number(item.quantity))), 99),
        }));

        setCart(localCart);

        if (localCart.length === 0) return;

        const ids = localCart.map((item) => item.id);

        const { data: pData, error } = await supabase
          .from("products")
          .select("id, price, stock")
          .in("id", ids);

        const { data: campaigns } = await supabase
          .from("campaigns")
          .select("*")
          .gte("end_date", new Date().toISOString());

        const now = new Date();

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
              now >= new Date(c.start_date) &&
              now <= new Date(c.end_date)
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
              quantity: fixedQuantity,
            };
          }

          return item;
        }).filter((item) => item.quantity > 0);

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

      const maxStock = product.stock != null ? Number(product.stock) : Infinity;

      if (existing) {
        const currentQty = Number(existing.quantity || 1);
        const addQty = Number(product.quantity || 1);
        const newQty = Math.min(currentQty + addQty, maxStock);

        if (newQty <= currentQty) return prev;

        return prev.map((item) =>
          String(item.id) === String(product.id)
            ? {
                ...item,
                quantity: newQty,
                ...(product.stock != null ? { stock: product.stock } : {}),
              }
            : item
        );
      }

      const qty = Math.min(Number(product.quantity || 1), maxStock);
      if (qty <= 0) return prev;

      return [
        ...prev,
        {
          ...product,
          quantity: qty,
        },
      ];
    });
  };

  const removeFromCart = (id: number | string) => {
    setCart((prev) => prev.filter((item) => String(item.id) !== String(id)));
  };

  const updateQuantity = (id: number | string, amount: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (String(item.id) !== String(id)) return item;

          const newQuantity = Number(item.quantity || 1) + amount;
          const maxStock = item.stock != null ? Number(item.stock) : Infinity;
          const capped = Math.min(newQuantity, maxStock);

          return { ...item, quantity: capped };
        })
        .filter((item) => item.quantity > 0);
    });
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