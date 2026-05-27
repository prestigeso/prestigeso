
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type AnalysisTab = "overview" | "revenue" | "orders" | "visits";
type RangeKey = "24h" | "7d" | "28d" | "90d" | "365d" | "all";

type OrderMetric = {
  id?: number;
  total_amount?: number;
  created_at?: string;
};

type VisitMetric = {
  id?: number;
  created_at?: string;
};

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "Son 24 Saat" },
  { key: "7d", label: "Son 7 Gün" },
  { key: "28d", label: "Son 28 Gün" },
  { key: "90d", label: "Son 90 Gün" },
  { key: "365d", label: "Son 365 Gün" },
  { key: "all", label: "Tüm Zamanlar" },
];

const TAB_OPTIONS: { key: AnalysisTab; label: string; href: string }[] = [
  { key: "overview", label: "Genel Bakış", href: "/admin/analysis" },
  { key: "revenue", label: "Ciro", href: "/admin/analysis?tab=revenue" },
  { key: "orders", label: "Siparişler", href: "/admin/analysis?tab=orders" },
  { key: "visits", label: "Ziyaretler", href: "/admin/analysis?tab=visits" },
];

function getRangeStart(range: RangeKey) {
  if (range === "all") return null;

  const now = new Date();
  const start = new Date(now);

  if (range === "24h") start.setHours(start.getHours() - 24);
  if (range === "7d") start.setDate(start.getDate() - 7);
  if (range === "28d") start.setDate(start.getDate() - 28);
  if (range === "90d") start.setDate(start.getDate() - 90);
  if (range === "365d") start.setDate(start.getDate() - 365);

  return start;
}

function isAfterRange(value: string | undefined, range: RangeKey) {
  if (range === "all") return true;
  if (!value) return false;

  const start = getRangeStart(range);
  if (!start) return true;

  return new Date(value).getTime() >= start.getTime();
}

function formatMoney(value: number) {
  return value.toLocaleString("tr-TR") + " ₺";
}

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function getTabFromUrl(): AnalysisTab {
  if (typeof window === "undefined") return "overview";

  const tab = new URLSearchParams(window.location.search).get("tab");

  if (tab === "revenue" || tab === "orders" || tab === "visits") {
    return tab;
  }

  return "overview";
}

export default function AdminAnalysisPage() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>("overview");
  const [range, setRange] = useState<RangeKey>("28d");
  const [orders, setOrders] = useState<OrderMetric[]>([]);
  const [visits, setVisits] = useState<VisitMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveTab(getTabFromUrl());
  }, []);

  useEffect(() => {
    const loadAnalysisData = async () => {
      setLoading(true);

      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, total_amount, created_at, payment_status")
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false });

        const { data: visitData } = await supabase
          .from("page_views")
          .select("id, created_at")
          .order("created_at", { ascending: false });

        setOrders((orderData as any) || []);
        setVisits((visitData as any) || []);
      } finally {
        setLoading(false);
      }
    };

    loadAnalysisData();
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => isAfterRange(order.created_at, range)),
    [orders, range]
  );

  const filteredVisits = useMemo(
    () => visits.filter((visit) => isAfterRange(visit.created_at, range)),
    [visits, range]
  );

  const revenue = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    [filteredOrders]
  );

  const orderCount = filteredOrders.length;
  const visitCount = filteredVisits.length;
  const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

  const focusTitle =
    activeTab === "revenue"
      ? "Ciro Analizi"
      : activeTab === "orders"
      ? "Sipariş Analizi"
      : activeTab === "visits"
      ? "Ziyaret Analizi"
      : "Genel Performans";

  const focusValue =
    activeTab === "revenue"
      ? formatMoney(revenue)
      : activeTab === "orders"
      ? formatNumber(orderCount)
      : activeTab === "visits"
      ? formatNumber(visitCount)
      : formatMoney(revenue);

  return (
    <div className="min-h-screen bg-gray-100 text-black font-sans px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
              Prestigeso Yönetim Paneli
            </p>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Analiz Merkezi
            </h1>
            <p className="text-sm font-bold text-gray-400 mt-2">
              Satış, sipariş ve ziyaret performansını ayrı analiz ekranından takip edin.
            </p>
          </div>

          <Link
            href="/admin"
            className="w-full md:w-auto bg-black text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-center active:scale-[0.98] transition-all"
          >
            ← Yönetim Paneline Dön
          </Link>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {TAB_OPTIONS.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  activeTab === tab.key
                    ? "bg-black text-white border-black"
                    : "bg-gray-50 text-gray-500 border-gray-100 hover:border-black"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {RANGE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  range === option.key
                    ? "bg-black text-white border-black"
                    : "bg-gray-50 text-gray-500 border-gray-100 hover:border-black"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-10 text-center text-sm font-black uppercase tracking-widest text-gray-400">
            Analiz verileri yükleniyor...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ciro</p>
                <p className="text-3xl font-black text-green-600">{formatMoney(revenue)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sipariş</p>
                <p className="text-3xl font-black text-black">{formatNumber(orderCount)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ziyaret</p>
                <p className="text-3xl font-black text-blue-600">{formatNumber(visitCount)}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ortalama Sipariş</p>
                <p className="text-3xl font-black text-black">{formatMoney(averageOrderValue)}</p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Seçili Görünüm
                  </p>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                    {focusTitle}
                  </h2>
                </div>
                <p className="text-4xl font-black text-black">{focusValue}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ciro Payı</p>
                  <div className="h-3 rounded-full bg-white overflow-hidden border border-gray-100">
                    <div className="h-full bg-green-500" style={{ width: revenue > 0 ? "100%" : "4%" }} />
                  </div>
                  <p className="text-xs font-bold text-gray-400 mt-3">{formatMoney(revenue)}</p>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sipariş Yoğunluğu</p>
                  <div className="h-3 rounded-full bg-white overflow-hidden border border-gray-100">
                    <div className="h-full bg-black" style={{ width: orderCount > 0 ? "100%" : "4%" }} />
                  </div>
                  <p className="text-xs font-bold text-gray-400 mt-3">{formatNumber(orderCount)} sipariş</p>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ziyaret Yoğunluğu</p>
                  <div className="h-3 rounded-full bg-white overflow-hidden border border-gray-100">
                    <div className="h-full bg-blue-500" style={{ width: visitCount > 0 ? "100%" : "4%" }} />
                  </div>
                  <p className="text-xs font-bold text-gray-400 mt-3">{formatNumber(visitCount)} ziyaret</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
