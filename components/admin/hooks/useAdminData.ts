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
      // 1) PRODUCTS
      const { data: pData, error: pErr } = await supabase
        .from("products")
        .select(
          'id,name,price,category,stock,"SKU",is_bestseller,discount_price,campaign_start_date,campaign_end_date,created_at,barcode,images,image,description'
        )
        .order("created_at", { ascending: false });

      if (pErr) {
        console.error("Ürünler çekilemedi:", pErr);
        setDbProducts([]);
      } else {
        setDbProducts((pData as any) || []);
      }

      // 2) SLIDES
      const { data: sData, error: sErr } = await supabase
        .from("hero_slides")
        .select("*")
        .order("created_at", { ascending: false });

      if (sErr) {
        console.error("Slide'lar çekilemedi:", sErr);
        setDbSlides([]);
      } else {
        setDbSlides((sData as any) || []);
      }

      // 3) CAMPAIGNS
      const { data: campData, error: campErr } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (campErr) {
        console.error("Kampanyalar çekilemedi:", campErr);
        setDbCampaigns([]);
      } else {
        setDbCampaigns((campData as any) || []);
      }

      // 4) MONTHLY METRICS
      // Sadece ödenmiş siparişler aylık sipariş/ciro hesabına girer.
      const { data: monthlyOrdersData, error: moErr } = await supabase
        .from("orders")
        .select("total_amount, created_at, payment_status")
        .eq("payment_status", "paid")
        .gte("created_at", firstDayOfThisMonthIso);

      if (moErr) {
        console.error("Aylık ödenmiş siparişler çekilemedi:", moErr);
        setMonthlyOrders(0);
        setMonthlyRevenue(0);
      } else {
        const list = monthlyOrdersData || [];

        setMonthlyOrders(list.length);
        setMonthlyRevenue(
          list.reduce(
            (acc: number, order: any) =>
              acc + Number(order.total_amount || 0),
            0
          )
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

      if (mErr) {
        console.error("Mesajlar çekilemedi:", mErr);
        setDbMessages([]);
      } else {
        setDbMessages((mData as any) || []);
      }

      // 6) REVIEWS
      const { data: rData, error: rErr } = await supabase
        .from("reviews")
        .select("*, products(name, image, images)")
        .order("created_at", { ascending: false });

      if (rErr) {
        console.error("Yorumlar çekilemedi:", rErr);
        setDbReviews([]);
      } else {
        setDbReviews((rData as any) || []);
      }

      // 7) FAVORITES
      const { data: favData, error: favErr } = await supabase
        .from("favorites")
        .select("product_id");

      if (favErr) {
        console.error("Favoriler çekilemedi:", favErr);
        setDbAllFavorites([]);
      } else {
        setDbAllFavorites((favData as any) || []);
      }

      // 8) PRODUCT VIEWS
      const { data: viewData, error: viewErr } = await supabase
        .from("product_views")
        .select("product_id");

      if (viewErr) {
        console.error("Ürün görüntülenmeleri çekilemedi:", viewErr);
        setDbProductViews([]);
      } else {
        setDbProductViews((viewData as any) || []);
      }

      // 9) QUESTIONS
      const { data: qData, error: qErr } = await supabase
        .from("questions")
        .select("*, products(name, image, images)")
        .order("created_at", { ascending: false });

      if (qErr) {
        console.error("Sorular çekilemedi:", qErr);
        setDbQuestions([]);
      } else {
        setDbQuestions((qData as any) || []);
      }

      // 10) ALL TIME ORDERS
      // Admin sipariş listesinde sadece ödeme alınmış siparişler görünür.
      const { data: allOrdersData, error: aoErr } = await supabase
        .from("orders")
        .select(
          "id, order_no, merchant_oid, user_id, user_email, items, shipping_address, status, total_amount, created_at, shipping_carrier, tracking_number, payment_provider, payment_status, paytr_total_amount, paid_at, failed_reason"
        )
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false });

      if (aoErr) {
        console.error("Ödenmiş siparişler çekilemedi:", aoErr);
        setDbOrders([]);
        setAllTimeOrders(0);
        setAllTimeRevenue(0);
      } else {
        const list = (allOrdersData as any[]) || [];

        setDbOrders(list);
        setAllTimeOrders(list.length);
        setAllTimeRevenue(
          list.reduce(
            (acc: number, order: any) =>
              acc + Number(order.total_amount || 0),
            0
          )
        );
      }

      // 11) ALL TIME VISITS
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

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return {
    loading,

    dbProducts,
    dbSlides,
    dbCampaigns,
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
    setDbMessages,
    setDbQuestions,
    setDbOrders,
    setDbReviews,
    setDbAllFavorites,
    setDbProductViews,
  };
}