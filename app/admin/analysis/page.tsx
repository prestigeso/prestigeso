"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type AnalysisTab = "overview" | "revenue" | "orders" | "visits";
type RangeKey = "24h" | "7d" | "28d" | "90d" | "365d" | "all";

type OrderMetric = {
  id?: number;
  total_amount?: number | string | null;
  created_at?: string | null;
};

type VisitMetric = {
  id?: number;
  created_at?: string | null;
};

type DailyMetric = {
  key: string;
  label: string;
  revenue: number;
  orders: number;
  visits: number;
};

const RANGE_OPTIONS: { key: RangeKey; label: string; shortLabel: string }[] = [
  { key: "24h", label: "Son 24 Saat", shortLabel: "24 Saat" },
  { key: "7d", label: "Son 7 Gün", shortLabel: "7 Gün" },
  { key: "28d", label: "Son 28 Gün", shortLabel: "28 Gün" },
  { key: "90d", label: "Son 90 Gün", shortLabel: "90 Gün" },
  { key: "365d", label: "Son 365 Gün", shortLabel: "365 Gün" },
  { key: "all", label: "Tüm Zamanlar", shortLabel: "Tümü" },
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

function isAfterRange(value: string | null | undefined, range: RangeKey) {
  if (range === "all") return true;
  if (!value) return false;

  const start = getRangeStart(range);
  if (!start) return true;

  return new Date(value).getTime() >= start.getTime();
}

function formatMoney(value: number) {
  return Number(value || 0).toLocaleString("tr-TR") + " ₺";
}

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("tr-TR");
}

function formatDateKey(dateValue: string | null | undefined) {
  if (!dateValue) return "unknown";

  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDayLabel(dateKey: string) {
  if (dateKey === "unknown") return "Tarih Yok";

  return new Date(dateKey + "T12:00:00").toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

function getTabFromUrl(): AnalysisTab {
  if (typeof window === "undefined") return "overview";

  const tab = new URLSearchParams(window.location.search).get("tab");

  if (tab === "revenue" || tab === "orders" || tab === "visits") {
    return tab;
  }

  return "overview";
}

function getPrimaryMetricValue(metric: DailyMetric, activeTab: AnalysisTab) {
  if (activeTab === "orders") return metric.orders;
  if (activeTab === "visits") return metric.visits;
  return metric.revenue;
}

function getPrimaryMetricLabel(activeTab: AnalysisTab) {
  if (activeTab === "orders") return "Sipariş";
  if (activeTab === "visits") return "Ziyaret";
  return "Ciro";
}

function getPrimaryMetricColor(activeTab: AnalysisTab) {
  if (activeTab === "orders") return "bg-black";
  if (activeTab === "visits") return "bg-blue-500";
  return "bg-green-500";
}

function getPrimaryMetricTextColor(activeTab: AnalysisTab) {
  if (activeTab === "orders") return "text-black";
  if (activeTab === "visits") return "text-blue-600";
  return "text-green-600";
}

function formatPrimaryMetric(value: number, activeTab: AnalysisTab) {
  if (activeTab === "revenue" || activeTab === "overview") return formatMoney(value);
  return formatNumber(value);
}

function buildDailyMetrics(orders: OrderMetric[], visits: VisitMetric[]) {
  const map = new Map<string, DailyMetric>();

  const ensureMetric = (key: string) => {
    const existing = map.get(key);
    if (existing) return existing;

    const next: DailyMetric = {
      key,
      label: formatDayLabel(key),
      revenue: 0,
      orders: 0,
      visits: 0,
    };

    map.set(key, next);
    return next;
  };

  orders.forEach((order) => {
    const key = formatDateKey(order.created_at);
    const metric = ensureMetric(key);
    metric.orders += 1;
    metric.revenue += Number(order.total_amount || 0);
  });

  visits.forEach((visit) => {
    const key = formatDateKey(visit.created_at);
    const metric = ensureMetric(key);
    metric.visits += 1;
  });

  return [...map.values()]
    .filter((metric) => metric.key !== "unknown")
    .sort((a, b) => a.key.localeCompare(b.key));
}

function getBestMetric(metrics: DailyMetric[], key: "revenue" | "orders" | "visits") {
  if (metrics.length === 0) return null;

  return [...metrics].sort((a, b) => b[key] - a[key])[0];
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
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .select("id, total_amount, created_at, payment_status")
          .eq("payment_status", "paid")
          .order("created_at", { ascending: false });

        const { data: visitData, error: visitError } = await supabase
          .from("page_views")
          .select("id, created_at")
          .order("created_at", { ascending: false });

        if (orderError) {
          console.error("Analiz sipariş verileri çekilemedi:", orderError);
          setOrders([]);
        } else {
          setOrders((orderData as any) || []);
        }

        if (visitError) {
          console.error("Analiz ziyaret verileri çekilemedi:", visitError);
          setVisits([]);
        } else {
          setVisits((visitData as any) || []);
        }
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
  const conversionRate = visitCount > 0 ? (orderCount / visitCount) * 100 : 0;

  const dailyMetrics = useMemo(
    () => buildDailyMetrics(filteredOrders, filteredVisits),
    [filteredOrders, filteredVisits]
  );

  const visibleDailyMetrics = useMemo(() => {
    if (range === "365d" || range === "all") return dailyMetrics.slice(-30);
    return dailyMetrics;
  }, [dailyMetrics, range]);

  const maxPrimaryMetric = useMemo(() => {
    const values = visibleDailyMetrics.map((metric) => getPrimaryMetricValue(metric, activeTab));
    return Math.max(...values, 1);
  }, [visibleDailyMetrics, activeTab]);

  const bestRevenueDay = useMemo(() => getBestMetric(dailyMetrics, "revenue"), [dailyMetrics]);
  const bestOrderDay = useMemo(() => getBestMetric(dailyMetrics, "orders"), [dailyMetrics]);
  const bestVisitDay = useMemo(() => getBestMetric(dailyMetrics, "visits"), [dailyMetrics]);

  const selectedRangeLabel = RANGE_OPTIONS.find((option) => option.key === range)?.label || "Seçili Aralık";

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
                {option.shortLabel}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ciro</p>
                <p className="text-3xl font-black text-green-600">{formatMoney(revenue)}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-3">Ödenmiş siparişlerden hesaplandı.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sipariş</p>
                <p className="text-3xl font-black text-black">{formatNumber(orderCount)}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-3">Sadece ödeme alınmış siparişler.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ziyaret</p>
                <p className="text-3xl font-black text-blue-600">{formatNumber(visitCount)}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-3">Page views kayıtlarından hesaplandı.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ortalama Sipariş</p>
                <p className="text-3xl font-black text-black">{formatMoney(averageOrderValue)}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-3">Ciro / sipariş adedi.</p>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Dönüşüm</p>
                <p className="text-3xl font-black text-purple-600">%{conversionRate.toFixed(2)}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-3">Sipariş / ziyaret oranı.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">En Yüksek Ciro Günü</p>
                <p className="text-xl font-black text-black">{bestRevenueDay ? bestRevenueDay.label : "Veri yok"}</p>
                <p className="text-sm font-black text-green-600 mt-2">{formatMoney(bestRevenueDay?.revenue || 0)}</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">En Çok Sipariş Günü</p>
                <p className="text-xl font-black text-black">{bestOrderDay ? bestOrderDay.label : "Veri yok"}</p>
                <p className="text-sm font-black text-black mt-2">{formatNumber(bestOrderDay?.orders || 0)} sipariş</p>
              </div>

              <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">En Yoğun Ziyaret Günü</p>
                <p className="text-xl font-black text-black">{bestVisitDay ? bestVisitDay.label : "Veri yok"}</p>
                <p className="text-sm font-black text-blue-600 mt-2">{formatNumber(bestVisitDay?.visits || 0)} ziyaret</p>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    {selectedRangeLabel}
                  </p>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">
                    {focusTitle}
                  </h2>
                  <p className="text-xs font-bold text-gray-400 mt-2">
                    Grafik seçili zaman aralığına göre günlük performansı gösterir.
                    {range === "365d" || range === "all" ? " Uzun aralıklarda son 30 gün gösterilir." : ""}
                  </p>
                </div>
                <p className={`text-4xl font-black ${getPrimaryMetricTextColor(activeTab)}`}>{focusValue}</p>
              </div>

              {visibleDailyMetrics.length === 0 ? (
                <div className="rounded-3xl bg-gray-50 border border-gray-100 p-10 text-center">
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">
                    Seçili aralıkta grafik oluşturacak veri yok.
                  </p>
                </div>
              ) : (
                <div className="h-80 flex items-end gap-2 border-b border-gray-100 pb-4 overflow-x-auto">
                  {visibleDailyMetrics.map((metric) => {
                    const value = getPrimaryMetricValue(metric, activeTab);
                    const height = Math.max((value / maxPrimaryMetric) * 100, value > 0 ? 8 : 3);

                    return (
                      <div key={metric.key} className="min-w-10 flex-1 flex flex-col items-center justify-end gap-2 h-full">
                        <div className="text-[10px] font-black text-gray-400 whitespace-nowrap">
                          {formatPrimaryMetric(value, activeTab)}
                        </div>
                        <div className="w-full h-56 flex items-end justify-center">
                          <div
                            className={`w-full max-w-12 rounded-t-2xl ${getPrimaryMetricColor(activeTab)} transition-all`}
                            style={{ height: `${height}%` }}
                            title={`${metric.label} - ${getPrimaryMetricLabel(activeTab)}: ${formatPrimaryMetric(value, activeTab)}`}
                          />
                        </div>
                        <div className="text-[10px] font-black text-gray-400 whitespace-nowrap">
                          {metric.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Veri Özeti</p>
                  <h2 className="text-xl font-black uppercase tracking-tight">Günlük Kırılım</h2>
                </div>
                <p className="text-xs font-bold text-gray-400">
                  Toplam {formatNumber(dailyMetrics.length)} gün verisi listeleniyor.
                </p>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[720px] space-y-2">
                  <div className="grid grid-cols-4 gap-3 px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <span>Gün</span>
                    <span>Ciro</span>
                    <span>Sipariş</span>
                    <span>Ziyaret</span>
                  </div>

                  {[...dailyMetrics].reverse().slice(0, 12).map((metric) => (
                    <div key={metric.key} className="grid grid-cols-4 gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-xs font-black">
                      <span>{metric.label}</span>
                      <span className="text-green-600">{formatMoney(metric.revenue)}</span>
                      <span>{formatNumber(metric.orders)}</span>
                      <span className="text-blue-600">{formatNumber(metric.visits)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
