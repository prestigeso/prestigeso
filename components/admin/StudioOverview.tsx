"use client";
import { useEffect, useState } from "react";
import type { OrderRow } from "./types";
import { parseOrderItems } from "@/lib/orders/orderPresentation";
import StudioTrendChart from "./StudioTrendChart";
import s from "./OverviewSoft.module.css";

type OverviewReport = {finance:{gross:number;orders:number};visits:number;series:{timestamp:number;gross:number;orders:number;visits:number}[];trendyolArchive?:{complete:boolean;firstAvailableAt:number|null}};
type Metric = "revenue" | "orders" | "visits";
const metricNames = {
  revenue: "Ciro (₺)",
  orders: "Satış siparişi",
  visits: "Sayfa ziyareti",
};
export function StudioChart({
  rows,
  unit,
}: {
  rows: { label: string; value: number }[];
  unit: string;
}) {
  return (
    <StudioTrendChart
      rows={rows.map((r) => ({ ...r, previous: null }))}
      unit={unit}
    />
  );
}
function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    revenue: "M3 6h18v14H3z M3 6V4h15v2 M15 11h6v5h-6z",
    visits: "m4 3 6 17 3-7 7-3z",
    orders: "M5 7h14l1 14H4z M9 7V5a3 3 0 0 1 6 0v2",
    issues: "M12 8v5 M12 16h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20",
  };
  return (
    <span className={s.icon} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={paths[name] || paths.orders} />
      </svg>
    </span>
  );
}
export default function StudioOverview({
  loading,
  error,
  issues,
  onIssues,
  recentOrders = [],
  onOrder,
  onOrders,
  revision = 0,
}: {
  loading: boolean;
  error: string;
  revenue: number;
  orders: number;
  visits: number;
  issues: number | null;
  onIssues: () => void;
  recentOrders?: OrderRow[];
  onOrder?: (o: OrderRow) => void;
  onOrders?: () => void;
  revision?: number;
}) {
  const [metric, setMetric] = useState<Metric>("revenue"),
    [period, setPeriod] = useState("28"),
    [daily, setDaily] = useState<OverviewReport | null>(
      null,
    ),
    [chartError, setChartError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    const timer=setTimeout(()=>{setDaily(null);setChartError('');
    fetch(`/api/admin/finance/summary?days=${period}&overview=1`, { signal: c.signal, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok)
          throw Error(
            r.status === 401
              ? "Oturum doğrulanamadı. Yeniden giriş yapın."
              : d.error || "Grafik alınamadı.",
          );
        if (!c.signal.aborted) setDaily(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setChartError(e.message);
      });},0);
    return () => {clearTimeout(timer);c.abort();};
  }, [period, revision]);
  const days=Number(period);
  const rows = (daily?.series||[]).map(row=>({
      label: new Date(row.timestamp).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "short",
        ...(days<=2?{hour:'2-digit',minute:'2-digit'} as const:{}),
        ...(days===365?{year:'numeric'} as const:{}),
        timeZone: "Europe/Istanbul",
      }),
      value: metric==='revenue'?row.gross:row[metric],
      previous:null,
  }));
  const selectedTotals = (key: Metric) => {
    if(chartError||!daily)return null;
    return key==='revenue'?daily.finance.gross:key==='orders'?daily.finance.orders:daily.visits;
  };
  const display = (value: number | null, money = false) =>
    loading
      ? "Yükleniyor…"
      : value === null
        ? "Veri yok"
        : value.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) +
          (money ? " ₺" : "");
  const periodLabel = days<=2 ? `Son ${days*24} saat` : `Son ${days} gün`;
  const recent = recentOrders
    .filter((o) =>
      ["paid", "partially_refunded", "refunded"].includes(
        o.payment_status || "",
      ),
    )
    .toSorted((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 3);
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <h1>PrestigeSO Yönetim Paneli</h1>
          <p>Mağazanıza genel bakış. Önemli sayılar, sade bir görünümde.</p>
        </div>
        <label className={s.date}>
          Rapor dönemi
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="1">Son 24 saat</option>
            <option value="2">Son 48 saat</option>
            <option value="7">Son 7 gün</option>
            <option value="28">Son 28 gün</option>
            <option value="90">Son 90 gün</option>
            <option value="365">Son 365 gün</option>
          </select>
        </label>
      </header>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {daily?.trendyolArchive?.complete === false && <p className={s.notice}>Trendyol sipariş arşivi seçili dönemi tam kapsamıyor. Ciro ve sipariş sayısı yalnız kayıtlı satışları gösterir; eksik günler sıfır satış kabul edilmez.</p>}
      <section className={s.metrics} aria-label="Mağaza özeti">
        {(
          [
            ["revenue", "Mağaza cirosu", "Mağaza + Trendyol · gider öncesi"],
            [
              "visits",
              "Mağaza ziyaretleri",
              "Sayfa ziyareti · tekil kişi değil",
            ],
            ["orders", "Sipariş adedi", "Mağaza + Trendyol"],
          ] as const
        ).map(([key, label, note]) => (
          <button
            key={key}
            className={s.metric}
            aria-pressed={metric === key}
            onClick={() => setMetric(key)}
          >
            <span className={s.metricTop}>
              {label}
              <Icon name={key} />
            </span>
            <strong>{display(selectedTotals(key), key === "revenue")}</strong>
            <small>
              {periodLabel} · {note}
            </small>
          </button>
        ))}
        <button className={`${s.metric} ${s.issue}`} onClick={onIssues}>
          <span className={s.metricTop}>
            Sorunlu ödemeler
            <Icon name="issues" />
          </span>
          <strong>{display(error ? null : issues)}</strong>
          <small>Şu anda kontrol bekleyen ↗</small>
        </button>
      </section>
      <section className={s.panel}>
        <div className={s.panelHead}>
          <div>
            <h2>Mağazanız nasıl gidiyor?</h2>
            <p className={s.caption}>{days<=2?'Saatlik':'Günlük'} performans · Satışlarda mağaza + Trendyol</p>
          </div>
          <div className={s.switch} role="group" aria-label="Grafik metriği">
            {(
              [
                ["revenue", "Ciro"],
                ["visits", "Ziyaret"],
                ["orders", "Sipariş"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={metric === key}
                onClick={() => setMetric(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={s.total}>
          <strong>
            {display(selectedTotals(metric), metric === "revenue")}
          </strong>
          <span>
            {periodLabel}
            {' · arşivdeki kayıtların toplamı'}
          </span>
        </div>
        {chartError ? (
          <p role="alert" className={s.error}>
            {chartError}
          </p>
        ) : !daily ? (
          <p className={s.empty}>Grafik yükleniyor…</p>
        ) : rows.some((r) => r.value !== null) ? (
          <StudioTrendChart
            key={`${metric}-${period}`}
            rows={rows}
            unit={metricNames[metric]}
          />
        ) : (
          <p className={s.empty}>Bu dönem için günlük kayıt bulunamadı.</p>
        )}
      </section>
      <section className={s.recent}>
        <div className={s.recentHead}>
          <div>
            <h2>Son siparişler</h2>
            <p className={s.caption}>Mağazanın son ödenen siparişleri</p>
          </div>
          <button onClick={onOrders}>Tüm satış kanallarını gör ↗</button>
        </div>
        {recent.map((o) => (
          <div className={s.order} key={o.id}>
            <Icon name="orders" />
            <div>
              <button onClick={() => onOrder?.(o)}>
                {o.order_no || `#${o.id}`}
              </button>
              <p>
                {parseOrderItems(o.items)[0]?.name || "Sipariş detayı"} ·{" "}
                {o.status === "Bekliyor" ? "Sipariş alındı" : o.status}
              </p>
            </div>
            <strong>{Number(o.total_amount).toLocaleString("tr-TR")} ₺</strong>
            <span className={s.badge}>Mağaza</span>
          </div>
        ))}
        {!recent.length && (
          <p className={s.note}>
            {loading
              ? "Siparişler yükleniyor…"
              : error
                ? "Sipariş özeti alınamadı."
                : "Gösterilecek ödenen mağaza siparişi yok."}
          </p>
        )}
      </section>
    </div>
  );
}
