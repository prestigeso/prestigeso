"use client";

import { useMemo } from "react";
import type { MessageRow, QuestionRow, ReviewRow, OrderRow, ProductRow } from "../types";
import { getTimeAgo } from "../utils";

export type AdminNotifType = "order" | "message" | "question" | "review" | "stock";

export type AdminNotification = {
  id: string;
  type: AdminNotifType;
  title: string;
  subtitle: string;
  date: string; // ISO string
  image: string | null; // message türünde null olabilir
  timeAgo: string; // UI kolaylığı için hazır
  onClick?: () => void; // isteğe bağlı, UI tarafı bağlar
};

type Params = {
  dbOrders: OrderRow[];
  dbQuestions: QuestionRow[];
  dbReviews: ReviewRow[];
  dbMessages: MessageRow[];
  dbProducts: ProductRow[];

  // UI aksiyonları (opsiyonel)
  onOpenOrders?: () => void;
  onOpenQuestions?: () => void;
  onOpenReviews?: () => void;
  onOpenMessages?: () => void;
  onShowOutOfStock?: () => void;
};

export function useAdminNotifications(params: Params) {
  const {
    dbOrders,
    dbQuestions,
    dbReviews,
    dbMessages,
    dbProducts,
    onOpenOrders,
    onOpenQuestions,
    onOpenReviews,
    onOpenMessages,
    onShowOutOfStock,
  } = params;

  const unreadMessagesCount = useMemo(
    () => (dbMessages || []).filter((m) => !m.answer).length,
    [dbMessages]
  );

  const unansweredQuestionsCount = useMemo(
    () => (dbQuestions || []).filter((q) => !q.answer).length,
    [dbQuestions]
  );

  const pendingReviewsCount = useMemo(
    () => (dbReviews || []).filter((r) => !r.is_approved).length,
    [dbReviews]
  );

  const pendingOrdersCount = useMemo(
    () => (dbOrders || []).filter((o) => o.status === "Bekliyor").length,
    [dbOrders]
  );

  const unifiedNotifications = useMemo<AdminNotification[]>(() => {
    const feed: AdminNotification[] = [];

    // 1) Bekleyen siparişler
    (dbOrders || [])
      .filter((o) => o.status === "Bekliyor")
      .forEach((o) => {
        const img =
          o.items?.[0]?.images?.[0] || o.items?.[0]?.image || "/logo.jpeg";
        feed.push({
          id: `order_${o.id}`,
          type: "order",
          title: "Yeni Sipariş Geldi",
          subtitle: o.user_email,
          date: o.created_at,
          image: img,
          timeAgo: getTimeAgo(o.created_at),
          onClick: onOpenOrders,
        });
      });

    // 2) Cevapsız sorular
    (dbQuestions || [])
      .filter((q) => !q.answer)
      .forEach((q) => {
        const img =
          q.products?.images?.[0] || q.products?.image || "/logo.jpeg";
        feed.push({
          id: `q_${q.id}`,
          type: "question",
          title: "Yeni Ürün Sorusu",
          subtitle: q.question,
          date: q.created_at,
          image: img,
          timeAgo: getTimeAgo(q.created_at),
          onClick: onOpenQuestions,
        });
      });

    // 3) Onay bekleyen yorumlar
    (dbReviews || [])
      .filter((r) => !r.is_approved)
      .forEach((r) => {
        const img =
          r.products?.images?.[0] || r.products?.image || "/logo.jpeg";
        feed.push({
          id: `rev_${r.id}`,
          type: "review",
          title: "Yeni Değerlendirme",
          subtitle: `${"★".repeat(r.rating)} - ${r.user_name}`,
          date: r.created_at,
          image: img,
          timeAgo: getTimeAgo(r.created_at),
          onClick: onOpenReviews,
        });
      });

    // 4) Cevapsız müşteri mesajları
    (dbMessages || [])
      .filter((m) => !m.answer)
      .forEach((m) => {
        feed.push({
          id: `msg_${m.id}`,
          type: "message",
          title: "Müşteri Mesajı",
          subtitle: m.user_email,
          date: m.created_at,
          image: null,
          timeAgo: getTimeAgo(m.created_at),
          onClick: onOpenMessages,
        });
      });

    // 5) Stoğu biten ürünler
    (dbProducts || [])
      .filter((p) => Number(p.stock) <= 0)
      .forEach((p: any) => {
        const img = p.images?.[0] || p.image || "/logo.jpeg";
        feed.push({
          id: `stock_${p.id}`,
          type: "stock",
          title: "Stok Tükendi",
          subtitle: p.name,
          date: p.created_at || new Date().toISOString(),
          image: img,
          timeAgo: getTimeAgo(p.created_at),
          onClick: onShowOutOfStock,
        });
      });

    // Tarihe göre (en yeni -> en eski)
    return feed.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [
    dbOrders,
    dbQuestions,
    dbReviews,
    dbMessages,
    dbProducts,
    onOpenOrders,
    onOpenQuestions,
    onOpenReviews,
    onOpenMessages,
    onShowOutOfStock,
  ]);

  const totalNotifications = unifiedNotifications.length;

  return {
    unifiedNotifications,
    totalNotifications,
    unreadMessagesCount,
    unansweredQuestionsCount,
    pendingReviewsCount,
    pendingOrdersCount,
  };
}