"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { safeParseIds } from "@/lib/utils";
import type { Campaign, CartItem } from "@/types";

export type { CartItem } from "@/types";

type CartContextType = {
  cart: CartItem[];
  items: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  toggleCart: () => void;

  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number, variantId?: number) => void;
  updateQuantity: (id: number, amount: number, variantId?: number) => void;

  clearCart: () => void;

  cartTotal: number;

  campaignText: string;
  setCampaignText: (text: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isSameCartLine = (
  item: CartItem,
  productId: number,
  variantId?: number,
) =>
  Number(item.id) === Number(productId) &&
  Number(item.variant_id || 0) === Number(variantId || 0);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const hydratedRef = useRef(false);

  const [campaignText, setCampaignText] = useState("");

  useEffect(() => {
    const loadAndSyncCart = async () => {
      const savedCart = localStorage.getItem("prestigeso_cart");

      if (!savedCart) {
        hydratedRef.current = true;
        return;
      }

      try {
        const parsed = JSON.parse(savedCart);

        if (!Array.isArray(parsed)) {
          localStorage.removeItem("prestigeso_cart");
          setCart([]);
          return;
        }

        // SEC-17: localStorage verileri doğrula — XSS ile zehirlenmiş elemanları filtrele
        const localCart: CartItem[] = parsed
          .filter(
            (item: unknown) =>
              isRecord(item) &&
              Number.isInteger(Number(item.id)) &&
              Number(item.id) > 0 &&
              typeof item.name === "string" &&
              Number.isFinite(Number(item.price)) &&
              Number(item.price) >= 0 &&
              Number.isFinite(Number(item.quantity)) &&
              Number(item.quantity) > 0,
          )
          .map((item: Record<string, unknown>) => ({
            id: Number(item.id),
            name: String(item.name).slice(0, 200),
            price: Number(item.price),
            image: typeof item.image === "string" ? item.image : "",
            quantity: Math.min(
              Math.max(1, Math.floor(Number(item.quantity))),
              99,
            ),
            ...(typeof item.category === "string"
              ? { category: item.category }
              : {}),
            ...(Number.isFinite(Number(item.stock))
              ? { stock: Math.max(0, Math.floor(Number(item.stock))) }
              : {}),
            ...(Number.isSafeInteger(Number(item.variant_id)) &&
            Number(item.variant_id) > 0
              ? {
                  variant_id: Number(item.variant_id),
                  variant_label:
                    typeof item.variant_label === "string"
                      ? item.variant_label.slice(0, 200)
                      : "",
                  variant_options: isRecord(item.variant_options)
                    ? (item.variant_options as Record<string, string>)
                    : {},
                }
              : {}),
          }));

        hydratedRef.current = true;
        setCart(localCart);

        if (localCart.length === 0) return;

        const ids = localCart.map((item) => item.id);

        const { data: pData, error } = await supabase
          .from("products")
          .select("id, price, stock")
          .in("id", ids);

        const variantIds = localCart.flatMap((item) =>
          item.variant_id ? [item.variant_id] : [],
        );
        const { data: variantRows } = variantIds.length
          ? await supabase
              .from("product_variants")
              .select("id,product_id,price,stock,is_active")
              .in("id", variantIds)
          : { data: [] };

        const { data: campaignRows } = await supabase
          .from("campaigns")
          .select("*")
          .gte("end_date", new Date().toISOString());
        const campaigns = (campaignRows || []) as Campaign[];

        const now = new Date();

        if (!pData || error) return;

        let isChanged = false;

        const availableItems = localCart.filter((item) => {
          const dbItem = pData.find((p) => String(p.id) === String(item.id));
          const variant = item.variant_id
            ? (variantRows || []).find(
                (row) =>
                  Number(row.id) === item.variant_id &&
                  Number(row.product_id) === item.id &&
                  row.is_active !== false,
              )
            : null;

          if (
            !dbItem ||
            (item.variant_id ? !variant || Number(variant.stock) <= 0 : Number(dbItem.stock) <= 0)
          ) {
            isChanged = true;
            return false;
          }

          return true;
        });

        const syncedCart = availableItems
          .map((item) => {
            const dbItem = pData.find((p) => String(p.id) === String(item.id));
            const variant = item.variant_id
              ? (variantRows || []).find((row) => Number(row.id) === item.variant_id)
              : null;

            if (!dbItem) {
              isChanged = true;
              return item;
            }

            const activeCamp = campaigns.find((c) => {
              const campaignProductIds = safeParseIds(c.product_ids);

              return (
                campaignProductIds.includes(Number(dbItem.id)) &&
                now >= new Date(c.start_date) &&
                now <= new Date(c.end_date)
              );
            });

            const basePrice = variant?.price == null ? Number(dbItem.price) : Number(variant.price);
            const activePrice = activeCamp
              ? basePrice * (1 - activeCamp.discount_percent / 100)
              : basePrice;

            const dbStock = Number(variant?.stock ?? dbItem.stock ?? 0);
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
          })
          .filter((item) => item.quantity > 0);

        if (isChanged) {
          setCart(syncedCart);
        }
      } catch (e) {
        hydratedRef.current = true;
        console.error("Sepet okunurken hata oluştu:", e);
        localStorage.removeItem("prestigeso_cart");
        setCart([]);
      }
    };

    void loadAndSyncCart();

    const savedCampaign = localStorage.getItem("prestigeso_campaign") || "";
    hydratedRef.current = true;
    const frame = requestAnimationFrame(() => setCampaignText(savedCampaign));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;

    localStorage.setItem("prestigeso_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (!hydratedRef.current) return;

    localStorage.setItem("prestigeso_campaign", campaignText);
  }, [campaignText]);

  const toggleCart = useCallback(() => {
    setIsCartOpen((value) => !value);
  }, []);

  const addToCart = useCallback((product: CartItem) => {
    setCart((prev) => {
      const existing = prev.find(
        (item) => isSameCartLine(item, product.id, product.variant_id),
      );

      const maxStock = product.stock != null ? Number(product.stock) : Infinity;

      if (existing) {
        const currentQty = Number(existing.quantity || 1);
        const addQty = Number(product.quantity || 1);
        const newQty = Math.min(currentQty + addQty, maxStock);

        if (newQty <= currentQty) return prev;

        return prev.map((item) =>
          isSameCartLine(item, product.id, product.variant_id)
            ? {
                ...item,
                quantity: newQty,
                ...(product.stock != null ? { stock: product.stock } : {}),
              }
            : item,
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
  }, []);

  const removeFromCart = useCallback((id: number, variantId?: number) => {
    setCart((prev) => prev.filter((item) => !isSameCartLine(item, id, variantId)));
  }, []);

  const updateQuantity = useCallback((id: number, amount: number, variantId?: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (!isSameCartLine(item, id, variantId)) return item;

          const newQuantity = Number(item.quantity || 1) + amount;
          const maxStock = item.stock != null ? Number(item.stock) : Infinity;
          const capped = Math.min(newQuantity, maxStock);

          return { ...item, quantity: capped };
        })
        .filter((item) => item.quantity > 0);
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    localStorage.removeItem("prestigeso_cart");
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      return total + Number(item.price || 0) * Number(item.quantity || 1);
    }, 0);
  }, [cart]);

  const value = useMemo<CartContextType>(
    () => ({
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
    }),
    [
      addToCart,
      campaignText,
      cart,
      cartTotal,
      clearCart,
      isCartOpen,
      removeFromCart,
      toggleCart,
      updateQuantity,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
};
