"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  CampaignRow,
  CategoryRow,
  MessageRow,
  OrderRow,
  ProductRow,
  QuestionRow,
  ReviewRow,
  Slide,
} from "../types";
import type { ProductMetric } from "./usePerformanceData";

type DashboardData = {
  products: ProductRow[];
  slides: Slide[];
  campaigns: CampaignRow[];
  categories: CategoryRow[];
  messages: MessageRow[];
  questions: QuestionRow[];
  orders: OrderRow[];
  reviews: ReviewRow[];
  productMetrics: ProductMetric[];
  totals: {
    monthly_order_count?: number | string;
    monthly_revenue?: number | string;
    all_time_order_count?: number | string;
    all_time_revenue?: number | string;
  };
  monthlyVisits: number;
  allVisits: number;
  counts: DashboardCounts;
};

export type DashboardCounts = {
  products: number;
  unreadMessages: number;
  unansweredQuestions: number;
  pendingReviews: number;
  pendingOrders: number;
  stalePayments: number;
  failedPayments: number;
  reconciliationIssues: number;
};

const EMPTY_COUNTS: DashboardCounts = {
  products: 0,
  unreadMessages: 0,
  unansweredQuestions: 0,
  pendingReviews: 0,
  pendingOrders: 0,
  stalePayments: 0,
  failedPayments: 0,
  reconciliationIssues: 0,
};

type PaginatedResource = "messages" | "questions" | "orders";
type ListMeta = {
  page: number;
  limit: number;
  total: number;
  loading: boolean;
};

const INITIAL_LIST_META: ListMeta = {
  page: 1,
  limit: 25,
  total: 0,
  loading: false,
};

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
  const [productMetrics, setProductMetrics] = useState<ProductMetric[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyOrders, setMonthlyOrders] = useState(0);
  const [monthlyVisits, setMonthlyVisits] = useState(0);
  const [allTimeRevenue, setAllTimeRevenue] = useState(0);
  const [allTimeOrders, setAllTimeOrders] = useState(0);
  const [allTimeVisits, setAllTimeVisits] = useState(0);
  const [dashboardCounts, setDashboardCounts] = useState(EMPTY_COUNTS);
  const [listMeta, setListMeta] = useState<Record<PaginatedResource, ListMeta>>(
    {
      messages: { ...INITIAL_LIST_META },
      questions: { ...INITIAL_LIST_META },
      orders: { ...INITIAL_LIST_META },
    },
  );

  const loadAdminList = useCallback(
    async (resource: PaginatedResource, page = 1) => {
      setListMeta((previous) => ({
        ...previous,
        [resource]: { ...previous[resource], loading: true },
      }));
      try {
        const response = await fetch(
          `/api/admin/lists?resource=${resource}&page=${page}&limit=25`,
          { credentials: "include", cache: "no-store" },
        );
        const payload = (await response.json()) as {
          items?: unknown[];
          page?: number;
          limit?: number;
          total?: number;
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error || "Liste yüklenemedi.");

        if (resource === "messages")
          setDbMessages((payload.items || []) as MessageRow[]);
        else if (resource === "questions")
          setDbQuestions((payload.items || []) as QuestionRow[]);
        else setDbOrders((payload.items || []) as OrderRow[]);

        setListMeta((previous) => ({
          ...previous,
          [resource]: {
            page: payload.page || page,
            limit: payload.limit || 25,
            total: payload.total || 0,
            loading: false,
          },
        }));
      } catch (error) {
        console.error(error);
        setListMeta((previous) => ({
          ...previous,
          [resource]: { ...previous[resource], loading: false },
        }));
      }
    },
    [],
  );

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/dashboard", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await response.json()) as DashboardData & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || "Admin verileri yüklenemedi.");
      setDbProducts(data.products);
      setDbSlides(data.slides);
      setDbCampaigns(data.campaigns);
      setDbCategories(data.categories);
      setDbMessages(data.messages);
      setDbQuestions(data.questions);
      setDbOrders(data.orders);
      setDbReviews(data.reviews);
      setProductMetrics(data.productMetrics);
      setMonthlyOrders(Number(data.totals.monthly_order_count || 0));
      setMonthlyRevenue(Number(data.totals.monthly_revenue || 0));
      setMonthlyVisits(data.monthlyVisits);
      setAllTimeOrders(Number(data.totals.all_time_order_count || 0));
      setAllTimeRevenue(Number(data.totals.all_time_revenue || 0));
      setAllTimeVisits(data.allVisits);
      setDashboardCounts(data.counts || EMPTY_COUNTS);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAllData();
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
    productMetrics,
    monthlyRevenue,
    monthlyOrders,
    monthlyVisits,
    allTimeRevenue,
    allTimeOrders,
    allTimeVisits,
    dashboardCounts,
    loadAllData,
    setDbProducts,
    setDbSlides,
    setDbCampaigns,
    setDbCategories,
    setDbMessages,
    setDbQuestions,
    setDbOrders,
    setDbReviews,
    setProductMetrics,
    listMeta,
    loadAdminList,
  };
}
