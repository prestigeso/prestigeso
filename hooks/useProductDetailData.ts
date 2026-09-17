"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getActivePriceCampaign } from "@/lib/commerce/catalogPricing";
import { useConsentedView } from "@/hooks/useConsentedView";
import { parsePurchasedItems } from "@/lib/products/productDetail";
import { safeStorageGet, safeStorageSet } from "@/lib/browserStorage";
import type {
  Campaign,
  Product,
  ProductVariant,
  Question,
  Review,
} from "@/types";

function rememberProduct(product: Product) {
  try {
    const current = JSON.parse(
      safeStorageGet("local", "prestige_viewed") || "[]",
    );
    if (!Array.isArray(current)) return;
    const filtered = current.filter(
      (item: unknown) =>
        item &&
        typeof item === "object" &&
        String((item as Record<string, unknown>).id) !== String(product.id),
    );
    safeStorageSet(
      "local",
      "prestige_viewed",
      JSON.stringify([product, ...filtered].slice(0, 10)),
    );
  } catch (error) {
    console.warn("Son görüntülenen ürünler güncellenemedi:", error);
  }
}

export function useProductDetailData(
  productId: string,
  initialProduct?: Product | null,
) {
  const [product, setProduct] = useState<Product | null>(
    initialProduct || null,
  );
  const [loading, setLoading] = useState(!initialProduct);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [purchaseDataStatus, setPurchaseDataStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [retryVersion, setRetryVersion] = useState(0);
  const retryPurchaseData = useCallback(
    () => setRetryVersion((version) => version + 1),
    [],
  );
  const remember = useCallback(() => {
    if (product) rememberProduct(product);
  }, [product]);
  useConsentedView(product?.id || 0, remember);

  useEffect(() => {
    let cancelled = false;
    let criticalReady = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const load = async () => {
      if (!productId) {
        setLoading(false);
        return;
      }

      setLoading(!initialProduct);
      setProduct(initialProduct || null);
      setIsFavorite(false);
      setActiveCampaign(null);
      setReviews([]);
      setQuestions([]);
      setCurrentUser(null);
      setHasPurchased(false);
      setVariants([]);
      setPurchaseDataStatus("loading");

      const productData =
        initialProduct ||
        (
          await supabase
            .from("products")
            .select("*")
            .eq("id", Number(productId))
            .abortSignal(controller.signal)
            .maybeSingle()
        ).data;

      if (!productData || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }

      const typedProduct = productData as Product;
      setProduct(typedProduct);

      const [campaignResult, variantResult] = await Promise.all([
        supabase
          .from("campaigns")
          .select("*")
          .gte("end_date", new Date().toISOString())
          .abortSignal(controller.signal),
        supabase
          .from("product_variants")
          .select(
            "id,product_id,sku,barcode,option_values,price,stock,is_active",
          )
          .eq("product_id", typedProduct.id)
          .eq("is_active", true)
          .order("id")
          .abortSignal(controller.signal),
      ]);
      if (cancelled) return;
      if (
        campaignResult.error ||
        variantResult.error ||
        !campaignResult.data ||
        !variantResult.data
      ) {
        setPurchaseDataStatus("error");
        setLoading(false);
        return;
      }
      setActiveCampaign(
        getActivePriceCampaign(
          Number(typedProduct.id),
          campaignResult.data as Campaign[],
        ),
      );
      setVariants(variantResult.data as ProductVariant[]);
      criticalReady = true;
      setPurchaseDataStatus("ready");
      setLoading(false);
      clearTimeout(timeout);

      const [reviewResult, questionResult, sessionResult] = await Promise.all([
        supabase
          .from("public_product_reviews")
          .select(
            "id,product_id,rating,comment,user_name,images,is_approved,created_at",
          )
          .eq("product_id", typedProduct.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("public_product_questions")
          .select(
            "id,product_id,question,user_name,answer,is_approved,answered_at,created_at",
          )
          .eq("product_id", typedProduct.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.auth.getSession(),
      ]);

      if (cancelled) return;

      setReviews((reviewResult.data || []) as Review[]);
      setQuestions((questionResult.data || []) as Question[]);

      const session = sessionResult.data.session;
      if (!session) {
        setLoading(false);
        return;
      }

      setCurrentUser(session.user);
      const [favoriteResult, orderResult] = await Promise.all([
        supabase
          .from("favorites")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("product_id", typedProduct.id)
          .maybeSingle(),
        supabase
          .from("orders")
          .select("items")
          .eq("user_id", session.user.id)
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (cancelled) return;
      setIsFavorite(Boolean(favoriteResult.data));
      setHasPurchased(
        (orderResult.data || []).some((order: { items: unknown }) =>
          parsePurchasedItems(order.items).some(
            (item) => String(item.id) === String(typedProduct.id),
          ),
        ),
      );
      setLoading(false);
    };

    void load().catch((error) => {
      console.error("Ürün detay verisi yüklenemedi:", error);
      if (!cancelled) {
        setLoading(false);
        if (!criticalReady) setPurchaseDataStatus("error");
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [initialProduct, productId, retryVersion]);

  return {
    product,
    loading,
    isFavorite,
    setIsFavorite,
    activeCampaign,
    reviews,
    questions,
    currentUser,
    setCurrentUser,
    hasPurchased,
    variants,
    purchaseDataStatus,
    retryPurchaseData,
  };
}
