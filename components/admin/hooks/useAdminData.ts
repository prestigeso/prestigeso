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
} from "../types";

/**
 * Admin panelde kullanılan tüm verileri tek yerden çeker.
 * - products, hero_slides, campaigns
 * - monthly: revenue/orders/visits
 * - all-time: revenue/orders/visits
 * - messages, questions, orders, reviews
 * - favorites (count) ve product_views (count) için ham listeler
 */
export function useAdminData() {
  const [loading, setLoading] = useState(true);

  const [dbProducts, setDbProducts] = useState<ProductRow[]>([]);
  const [dbSlides, setDbSlides] = useState<Slide[]>([]);
  const [dbCampaigns, setDbCampaigns] = useState<CampaignRow[]>([]);

  const [dbMessages, setDbMessages] = useState<MessageRow[]>([]);
  const [dbQuestions, setDbQuestions] = useState<QuestionRow[]>([]);
  const [dbOrders, setDbOrders] = useState<OrderRow[]>([]);
  const [dbReviews, setDbReviews] = useState<ReviewRow[]>([]);

  const [dbAllFavorites, setDbAllFavorites] = useState<any[]>([]);
  const [dbProductViews, setDbProductViews] = useState<any[]>([]);

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
      // 1) PRODUCTS  ✅ SKU seçimi eklendi
      const { data: pData, error: pErr } = await supabase
        .from("products")
        .select(
          'id,name,price,category,stock,"SKU",is_bestseller,discount_price,campaign_start_date,campaign_end_date,created_at,barcode,images,image,description'
        )
        .order("created_at", { ascending: false });

      if (pErr) {
        console.error("Ürünler çekilemedi:", pErr);
      } else {
        setDbProducts((pData as any) || []);
      }

      // 2) SLIDES
      const { data: sData, error: sErr } = await supabase
        .from("hero_slides")
        .select("*")
        .order("created_at", { ascending: false });

      if (sErr) console.error("Slide'lar çekilemedi:", sErr);
      else setDbSlides((sData as any) || []);

      // 3) CAMPAIGNS
      const { data: campData, error: campErr } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (campErr) console.error("Kampanyalar çekilemedi:", campErr);
      else setDbCampaigns((campData as any) || []);

      // 4) MONTHLY METRICS
      const { data: monthlyOrdersData, error: moErr } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .gte("created_at", firstDayOfThisMonthIso);

      if (moErr) {
        console.error("Aylık siparişler çekilemedi:", moErr);
        setMonthlyOrders(0);
        setMonthlyRevenue(0);
      } else {
        const list = monthlyOrdersData || [];
        setMonthlyOrders(list.length);
        setMonthlyRevenue(
          list.reduce((acc: number, o: any) => acc + Number(o.total_amount || 0), 0)
        );
      }

      const { data: monthlyVisitsData, error: mvErr } = await supabase
        .from("page_views")
        .select("id, created_at")
        .gte("created_at", firstDayOfThisMonthIso);

      if (mvErr) {
        console.error("Aylık ziyaretler çekilemedi:", mvErr);
        setMonthlyVisits(0);
      } else {
        setMonthlyVisits((monthlyVisitsData || []).length);
      }

      // 5) MESSAGES
      const { data: mData, error: mErr } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (mErr) console.error("Mesajlar çekilemedi:", mErr);
      else setDbMessages((mData as any) || []);

      // 6) REVIEWS
      const { data: rData, error: rErr } = await supabase
        .from("reviews")
        .select("*, products(name, image, images)")
        .order("created_at", { ascending: false });

      if (rErr) console.error("Yorumlar çekilemedi:", rErr);
      else setDbReviews((rData as any) || []);

      // 7) FAVORITES + VIEWS (ham listeler)
      const { data: favData, error: favErr } = await supabase
        .from("favorites")
        .select("product_id");

      if (favErr) console.error("Favoriler çekilemedi:", favErr);
      else setDbAllFavorites((favData as any) || []);

      const { data: viewData, error: viewErr } = await supabase
        .from("product_views")
        .select("product_id");

      if (viewErr) console.error("Ürün görüntülenmeleri çekilemedi:", viewErr);
      else setDbProductViews((viewData as any) || []);

      // 8) QUESTIONS
      const { data: qData, error: qErr } = await supabase
        .from("questions")
        .select("*, products(name, image, images)")
        .order("created_at", { ascending: false });

      if (qErr) console.error("Sorular çekilemedi:", qErr);
      else setDbQuestions((qData as any) || []);

      // 9) ALL TIME (orders + visits)
      const { data: allOrdersData, error: aoErr } = await supabase
        .from("orders")
        .select("id, created_at, user_email, items, shipping_address, status, total_amount")
        .order("created_at", { ascending: false });

      if (aoErr) {
        console.error("Tüm siparişler çekilemedi:", aoErr);
        setDbOrders([]);
        setAllTimeOrders(0);
        setAllTimeRevenue(0);
      } else {
        const list = (allOrdersData as any[]) || [];
        setDbOrders(list);
        setAllTimeOrders(list.length);
        setAllTimeRevenue(
          list.reduce((acc: number, o: any) => acc + Number(o.total_amount || 0), 0)
        );
      }

      const { data: allVisitsData, error: avErr } = await supabase
        .from("page_views")
        .select("id");

      if (avErr) {
        console.error("Tüm ziyaretler çekilemedi:", avErr);
        setAllTimeVisits(0);
      } else {
        setAllTimeVisits((allVisitsData || []).length);
      }
    } finally {
      setLoading(false);
    }
  }, [firstDayOfThisMonthIso]);

  // İlk yükleme
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    loading,

    // base data
    dbProducts,
    dbSlides,
    dbCampaigns,
    dbMessages,
    dbQuestions,
    dbOrders,
    dbReviews,

    // perf raw
    dbAllFavorites,
    dbProductViews,

    // monthly
    monthlyRevenue,
    monthlyOrders,
    monthlyVisits,

    // all time
    allTimeRevenue,
    allTimeOrders,
    allTimeVisits,

    // actions
    loadAllData,

    // setters
    setDbProducts,
    setDbSlides,
    setDbCampaigns,
    setDbMessages,
    setDbQuestions,
    setDbOrders,
    setDbReviews,
    setDbAllFavorites,
    setDbProductViews,
  };
}