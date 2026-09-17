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
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from "@/lib/browserStorage";
import { reconcileCart } from "@/lib/commerce/cartValidation";
import type { CartItem } from "@/types";

export type { CartItem } from "@/types";

type CartContextType = {
  cart: CartItem[];
  items: CartItem[];
  isHydrated: boolean;
  validationStatus: "pending" | "valid" | "error";
  validationMessage: string | null;
  retryCartValidation: () => Promise<boolean>;
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

function parseStoredCart(value: string): CartItem[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (item: unknown) =>
        isRecord(item) &&
        Number.isSafeInteger(Number(item.id)) &&
        Number(item.id) > 0 &&
        typeof item.name === "string" &&
        Number.isFinite(Number(item.price)) &&
        Number(item.price) >= 0 &&
        Number.isFinite(Number(item.quantity)) &&
        Number(item.quantity) > 0,
    )
    .slice(0, 100)
    .map((item: Record<string, unknown>) => ({
      id: Number(item.id),
      name: String(item.name).slice(0, 200),
      price: Number(item.price),
      image: typeof item.image === "string" ? item.image : "",
      quantity: Math.min(Math.max(1, Math.floor(Number(item.quantity))), 99),
      ...(typeof item.category === "string" ? { category: item.category } : {}),
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
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [campaignText, setCampaignText] = useState("");
  const [validationStatus, setValidationStatus] = useState<
    "pending" | "valid" | "error"
  >("pending");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const cartRef = useRef(cart);
  const requestVersion = useRef(0);
  const mutationVersion = useRef(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      let stored: CartItem[] = [];
      try {
        const value = safeStorageGet("local", "prestigeso_cart");
        stored = value ? parseStoredCart(value) : [];
      } catch {
        safeStorageRemove("local", "prestigeso_cart");
      }
      cartRef.current = stored;
      setCart(stored);
      setCampaignText(safeStorageGet("local", "prestigeso_campaign") || "");
      setIsHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const retryCartValidation = useCallback(async () => {
    const currentRequest = ++requestVersion.current;
    const currentMutation = mutationVersion.current;
    const snapshot = cartRef.current;
    if (!snapshot.length) {
      setValidationStatus("valid");
      setValidationMessage(null);
      return true;
    }
    setValidationStatus("pending");
    setValidationMessage(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const ids = [...new Set(snapshot.map((item) => item.id))];
      const [products, variants, campaigns] = await Promise.all([
        supabase
          .from("products")
          .select(
            "id,price,discount_price,campaign_start_date,campaign_end_date,stock",
          )
          .in("id", ids)
          .abortSignal(controller.signal),
        // Also fetch unselected active options to catch legacy variant-less cart lines.
        supabase
          .from("product_variants")
          .select("id,product_id,price,stock,is_active")
          .in("product_id", ids)
          .abortSignal(controller.signal),
        supabase
          .from("campaigns")
          .select("product_ids,discount_percent,start_date,end_date")
          .gte("end_date", new Date().toISOString())
          .abortSignal(controller.signal),
      ]);
      if (
        currentRequest !== requestVersion.current ||
        currentMutation !== mutationVersion.current
      )
        return false;
      const result = reconcileCart(snapshot, {
        products: products.data,
        variants: variants.data,
        campaigns: campaigns.data,
        failed: Boolean(products.error || variants.error || campaigns.error),
      });
      // Avoid another validation cycle when only verified price/stock changed.
      cartRef.current = result.cart;
      setCart((current) =>
        JSON.stringify(current) === JSON.stringify(result.cart)
          ? current
          : result.cart,
      );
      setValidationStatus(result.valid ? "valid" : "error");
      setValidationMessage(result.message);
      return result.valid;
    } catch {
      if (
        currentRequest === requestVersion.current &&
        currentMutation === mutationVersion.current
      ) {
        setValidationStatus("error");
        setValidationMessage(
          "Sepet fiyatı ve stok bilgisi doğrulanamadı. Ürünleriniz korundu; tekrar deneyin.",
        );
      }
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const frame = requestAnimationFrame(() => {
      void retryCartValidation();
    });
    return () => {
      cancelAnimationFrame(frame);
      requestVersion.current += 1;
    };
  }, [isHydrated, retryCartValidation]);

  useEffect(() => {
    if (!isHydrated) return;
    safeStorageSet("local", "prestigeso_cart", JSON.stringify(cart));
  }, [cart, isHydrated]);
  useEffect(() => {
    if (isHydrated)
      safeStorageSet("local", "prestigeso_campaign", campaignText);
  }, [campaignText, isHydrated]);

  const mutateCart = useCallback(
    (transform: (current: CartItem[]) => CartItem[]) => {
      mutationVersion.current += 1;
      requestVersion.current += 1;
      const next = transform(cartRef.current);
      cartRef.current = next;
      setCart(next);
      setValidationStatus(next.length ? "pending" : "valid");
      setValidationMessage(null);
      void retryCartValidation();
    },
    [retryCartValidation],
  );

  const toggleCart = useCallback(() => setIsCartOpen((value) => !value), []);
  const addToCart = useCallback(
    (product: CartItem) => {
      if (
        !Number.isSafeInteger(product.id) ||
        product.id <= 0 ||
        !Number.isFinite(Number(product.quantity)) ||
        Number(product.quantity) <= 0
      )
        return;
      if (
        !Number.isFinite(Number(product.price)) ||
        Number(product.price) < 0 ||
        (product.stock != null && !Number.isSafeInteger(product.stock))
      )
        return;
      mutateCart((prev) => {
        const existing = prev.find((item) =>
          isSameCartLine(item, product.id, product.variant_id),
        );
        const maxStock = Math.min(
          99,
          product.stock == null ? 99 : Math.max(0, Number(product.stock)),
        );
        const quantity = Math.min(
          Math.floor(Number(product.quantity)) +
            Number(existing?.quantity || 0),
          maxStock,
        );
        if (quantity <= 0) return prev;
        if (existing)
          return prev.map((item) =>
            isSameCartLine(item, product.id, product.variant_id)
              ? { ...item, ...product, quantity }
              : item,
          );
        return [...prev, { ...product, quantity }];
      });
    },
    [mutateCart],
  );
  const removeFromCart = useCallback(
    (id: number, variantId?: number) => {
      mutateCart((prev) =>
        prev.filter((item) => !isSameCartLine(item, id, variantId)),
      );
    },
    [mutateCart],
  );
  const updateQuantity = useCallback(
    (id: number, amount: number, variantId?: number) => {
      if (!Number.isSafeInteger(amount)) return;
      mutateCart((prev) =>
        prev
          .map((item) => {
            if (!isSameCartLine(item, id, variantId)) return item;
            const requested = item.quantity + amount;
            // Reducing an unavailable line must remain possible; a zero-stock line can be removed.
            const quantity =
              amount < 0
                ? requested
                : Math.min(requested, Number(item.stock ?? 99), 99);
            return { ...item, quantity };
          })
          .filter((item) => item.quantity > 0),
      );
    },
    [mutateCart],
  );
  const clearCart = useCallback(() => {
    mutateCart(() => []);
    safeStorageRemove("local", "prestigeso_cart");
  }, [mutateCart]);
  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total + Number(item.price || 0) * Number(item.quantity || 1),
        0,
      ),
    [cart],
  );
  const value = useMemo<CartContextType>(
    () => ({
      cart,
      items: cart,
      isHydrated,
      validationStatus,
      validationMessage,
      retryCartValidation,
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
      cart,
      isHydrated,
      validationStatus,
      validationMessage,
      retryCartValidation,
      isCartOpen,
      toggleCart,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      cartTotal,
      campaignText,
    ],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};
