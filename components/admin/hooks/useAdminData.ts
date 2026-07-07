"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type {
  Slide,
  ProductRow,
  MessageRow,
  QuestionRow,
  OrderRow,
  ReviewRow,
  CampaignRow,
  CategoryRow,
} from "../types";

/**
 * Admin panelde kullanılan tüm verileri tek yerden çeker.
 *
 * Önemli:
 * - Siparişlerde sadece ödeme alınmış kayıtlar çekilir.
 * - payment_status = "paid" olmayan siparişler admin panelde gerçek sipariş gibi gösterilmez.
 */
export function useAdminData() {
  const [loading, setLoading] = useState(true);

  const [dbProducts, setDbProducts] = useState<ProductRow[]>([]);
  const [dbSlides, setDbSlides] = useState<Slide[]>([]);
  const [dbCampaigns, setDbCampaigns] = useState<CampaignRow[]>([]);
  const [dbCategories, setDbCategories] = useState<CategoryRow[]>([]);

  const [dbMessages, setDbMessages] = useState<MessageRow[]>([]);
  const [dbQuestions, setDbQuestions] = useState<QuestionRow[]>([]);
  const [dbOrders, setDbOrders] = useState<OrderRow[]>([]);
  const [dbReviews, setDbReviews] = useState<ReviewRow[]>([]);

  const [dbAllFavorites, setDbAllFavorites] = useState<{ product_id: number }[]>([]);
  const [dbProductViews, setDbProductViews] = useState<{ product_id: number }[]>([]);

  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyOrders, setMonthlyOrders] = useState(0);
  const [monthlyVisits, setMonthlyVisits] = useState(0);

  const [allTimeRevenue, setAllTimeRevenue] = useState(0);
  const [allTimeOrders, setAllTimeOrders] = useState(0);
  const [allTimeVisits, setAllTimeVisits] = useState(0);

  const firstDayOfThisMonthIso = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);

    try {
      // Tüm sorguları paralel çalıştır (PERF-07)
      const [
        productsRes,
        slidesRes,
        campaignsRes,
        monthlyOrdersRes,
        monthlyVisitsRes,
        messagesRes,
        reviewsRes,
        favoritesRes,
        productViewsRes,
        questionsRes,
        allOrdersRes,
        allVisitsRes,
        categoriesRes,
      ] = await Promise.all([
        // 1) PRODUCTS
        supabase
          .from("products")
          .select(
            'id,name,price,category,stock,"SKU",is_bestseller,discount_price,campaign_start_date,campaign_end_date,created_at,barcode,images,image,description'
          )
          .order("created_at", { ascending: false }),
        // 2) SLIDES
        supabase
          .from("hero_slides")
          .select("*")
          .order("created_at", { ascending: false }),
        // 3) CAMPAIGNS
        supabase
          .from("campaigns")
          .select("*")
          .order("created_at", { ascending: false }),
        // 4) MONTHLY ORDERS
        supabase
          .from("orders")
          .select("total_amount, created_at, payment_status, status")
          .in("payment_status", ["paid", "refunded"])
          .gte("created_at", firstDayOfThisMonthIso),
        // 5) MONTHLY VISITS
        supabase
          .from("page_views")
          .select("id, created_at")
          .gte("created_at", firstDayOfThisMonthIso),
        // 6) MESSAGES
        supabase
          .from("messages")
          .select("*")
          .order("created_at", { ascending: false }),
        // 7) REVIEWS
        supabase
          .from("reviews")
          .select("*, products(name, image, images)")
          .order("created_at", { ascending: false }),
        // 8) FAVORITES
        supabase.from("favorites").select("product_id"),
        // 9) PRODUCT VIEWS
        supabase.from("product_views").select("product_id"),
        // 10) QUESTIONS
        supabase
          .from("questions")
          .select("*, products(name, image, images)")
          .order("created_at", { ascending: false }),
        // 11) ALL TIME ORDERS
        supabase
          .from("orders")
          .select(
            "id, order_no, merchant_oid, user_id, user_email, items, shipping_address, status, total_amount, created_at, shipping_carrier, tracking_number, payment_provider, payment_status, paytr_total_amount, paid_at, failed_reason"
          )
          .in("payment_status", ["paid", "refunded"])
          .order("created_at", { ascending: false }),
        // 12) ALL TIME VISITS
        supabase.from("page_views").select("id"),
        // 13) CATEGORIES
        supabase
          .from("categories")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      // Products
      if (productsRes.error) { console.error("Ürünler çekilemedi:", productsRes.error); setDbProducts([]); }
      else { setDbProducts((productsRes.data as any) || []); }

      // Slides
      if (slidesRes.error) { console.error("Slide'lar çekilemedi:", slidesRes.error); setDbSlides([]); }
      else { setDbSlides((slidesRes.data as any) || []); }

      // Campaigns
      if (campaignsRes.error) { console.error("Kampanyalar çekilemedi:", campaignsRes.error); setDbCampaigns([]); }
      else { setDbCampaigns((campaignsRes.data as any) || []); }

      // Categories
      if (categoriesRes.error) { console.error("Kategoriler çekilemedi:", categoriesRes.error); setDbCategories([]); }
      else { setDbCategories((categoriesRes.data as any) || []); }

      // Monthly metrics
      if (monthlyOrdersRes.error) {
        console.error("Aylık ödenmiş siparişler çekilemedi:", monthlyOrdersRes.error);
        setMonthlyOrders(0); setMonthlyRevenue(0);
      } else {
        const list = monthlyOrdersRes.data || [];
        const validList = list.filter((o: any) => o.payment_status === "paid" && o.status !== "İptal Edildi" && o.status !== "İade Edildi" && o.status !== "İptal edildi");
        setMonthlyOrders(validList.length);
        setMonthlyRevenue(validList.reduce((acc: number, order: any) => acc + Number(order.total_amount || 0), 0));
      }

      if (monthlyVisitsRes.error) { console.error("Aylık ziyaretler çekilemedi:", monthlyVisitsRes.error); setMonthlyVisits(0); }
      else { setMonthlyVisits((monthlyVisitsRes.data || []).length); }

      // Messages
      if (messagesRes.error) { console.error("Mesajlar çekilemedi:", messagesRes.error); setDbMessages([]); }
      else { setDbMessages((messagesRes.data as any) || []); }

      // Reviews
      if (reviewsRes.error) { console.error("Yorumlar çekilemedi:", reviewsRes.error); setDbReviews([]); }
      else { setDbReviews((reviewsRes.data as any) || []); }

      // Favorites
      if (favoritesRes.error) { console.error("Favoriler çekilemedi:", favoritesRes.error); setDbAllFavorites([]); }
      else { setDbAllFavorites((favoritesRes.data as any) || []); }

      // Product views
      if (productViewsRes.error) { console.error("Ürün görüntülenmeleri çekilemedi:", productViewsRes.error); setDbProductViews([]); }
      else { setDbProductViews((productViewsRes.data as any) || []); }

      // Questions
      if (questionsRes.error) { console.error("Sorular çekilemedi:", questionsRes.error); setDbQuestions([]); }
      else { setDbQuestions((questionsRes.data as any) || []); }

      // All time orders
      if (allOrdersRes.error) {
        console.error("Ödenmiş siparişler çekilemedi:", allOrdersRes.error);
        setDbOrders([]); setAllTimeOrders(0); setAllTimeRevenue(0);
      } else {
        const list = (allOrdersRes.data as any[]) || [];
        const validList = list.filter((o: any) => o.payment_status === "paid" && o.status !== "İptal Edildi" && o.status !== "İade Edildi" && o.status !== "İptal edildi");
        setDbOrders(list); // Biz listeyi state'e atarken hepsini atıyoruz ki admin iptal olanları da görebilsin
        setAllTimeOrders(validList.length);
        setAllTimeRevenue(validList.reduce((acc: number, order: any) => acc + Number(order.total_amount || 0), 0));
      }

      // All time visits
      if (allVisitsRes.error) { console.error("Tüm ziyaretler çekilemedi:", allVisitsRes.error); setAllTimeVisits(0); }
      else { setAllTimeVisits((allVisitsRes.data || []).length); }
    } finally {
      setLoading(false);
    }
  }, [firstDayOfThisMonthIso]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    loading,

    dbProducts,
    dbSlides,
    dbCampaigns,
    dbCategories,
    dbMessages,
    dbQuestions,
    dbOrders,
    dbReviews,

    dbAllFavorites,
    dbProductViews,

    monthlyRevenue,
    monthlyOrders,
    monthlyVisits,

    allTimeRevenue,
    allTimeOrders,
    allTimeVisits,

    loadAllData,

    setDbProducts,
    setDbSlides,
    setDbCampaigns,
    setDbCategories,
    setDbMessages,
    setDbQuestions,
    setDbOrders,
    setDbReviews,
    setDbAllFavorites,
    setDbProductViews,
  };
}