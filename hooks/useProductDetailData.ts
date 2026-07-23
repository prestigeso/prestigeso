"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { safeParseIds } from "@/lib/utils";
import { parsePurchasedItems } from "@/lib/products/productDetail";
import type { Campaign, Product, ProductVariant, Question, Review } from "@/types";

function rememberProduct(product: Product) {
  try {
    const current = JSON.parse(localStorage.getItem("prestige_viewed") || "[]");
    if (!Array.isArray(current)) return;
    const filtered = current.filter(
      (item: unknown) =>
        item &&
        typeof item === "object" &&
        String((item as Record<string, unknown>).id) !== String(product.id),
    );
    localStorage.setItem(
      "prestige_viewed",
      JSON.stringify([product, ...filtered].slice(0, 10)),
    );
  } catch (error) {
    console.warn("Son görüntülenen ürünler güncellenemedi:", error);
  }
}

async function recordProductView(productId: number) {
  try {
    const key = `viewed_product_log_${productId}`;
    if (sessionStorage.getItem(key)) return;
    const response = await fetch("/api/product-views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    if (response.ok) sessionStorage.setItem(key, "true");
  } catch (error) {
    console.warn("Ürün görüntüleme kaydı oluşturulamadı:", error);
  }
}

export function useProductDetailData(
  productId: string,
  initialProduct?: Product | null,
) {
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  useEffect(() => {
    let cancelled = false;

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

      const productData =
        initialProduct ||
        (
          await supabase
            .from("products")
            .select("*")
            .eq("id", Number(productId))
            .maybeSingle()
        ).data;

      if (!productData || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }

      const typedProduct = productData as Product;
      setProduct(typedProduct);
      rememberProduct(typedProduct);
      void recordProductView(Number(typedProduct.id));

      const [campaignResult, variantResult, reviewResult, questionResult, sessionResult] =
        await Promise.all([
          supabase
            .from("campaigns")
            .select("*")
            .gte("end_date", new Date().toISOString())
            .limit(100),
          supabase
            .from("product_variants")
            .select("id,product_id,sku,barcode,option_values,price,stock,is_active")
            .eq("product_id", typedProduct.id)
            .eq("is_active", true)
            .order("id")
            .limit(100),
          supabase
            .from("reviews")
            .select("*")
            .eq("product_id", typedProduct.id)
            .eq("is_approved", true)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase
            .from("questions")
            .select("*")
            .eq("product_id", typedProduct.id)
            .eq("is_approved", true)
            .order("created_at", { ascending: false })
            .limit(100),
          supabase.auth.getSession(),
        ]);

      if (cancelled) return;

      const now = new Date();
      const campaign = ((campaignResult.data || []) as Campaign[]).find(
        (item) =>
          safeParseIds(item.product_ids).includes(Number(typedProduct.id)) &&
          now >= new Date(item.start_date) &&
          now <= new Date(item.end_date),
      );
      setActiveCampaign(campaign || null);
      setVariants((variantResult.data || []) as ProductVariant[]);
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
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [initialProduct, productId]);

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
  };
}
