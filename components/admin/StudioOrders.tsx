"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { OrderRow, ProductRow } from "./types";
import {
  getOrderCustomerName,
  parseOrderItems,
} from "@/lib/orders/orderPresentation";
import { sanitizeImageUrl } from "@/lib/utils";
import type { projectPackages } from "@/lib/trendyol/packages";
import AdminPagination from "./parts/AdminPagination";
import TrendyolOrderDetail from "./TrendyolOrderDetail";
import s from "./AdminStudio.module.css";

type Packages = ReturnType<typeof projectPackages>;
const states = [
  ["all", "Tümü"],
  ["Bekliyor", "Sipariş alındı"],
  ["Hazırlanıyor", "Hazırlanıyor"],
  ["Kargolandı", "Kargoda"],
  ["Teslim Edildi", "Tamamlandı"],
  ["returns", "İptal / İade"],
];
const tyStates: Record<string, string> = {
  Created: "Bekliyor",
  Picking: "Hazırlanıyor",
  Invoiced: "Hazırlanıyor",
  Shipped: "Kargolandı",
  Delivered: "Teslim Edildi",
  Cancelled: "returns",
  Returned: "returns",
  UnDelivered: "Teslim edilemedi",
};
const stateLabel = (status: string) =>
  states.find(([key]) => key === status)?.[1] || status;
const failure = (response: Response, message?: string) =>
  response.status === 401
    ? "Oturumunuz sona ermiş veya doğrulanamıyor. Yeniden giriş yapın."
    : message || "Siparişler alınamadı. Lütfen tekrar deneyin.";

export default function StudioOrders({
  products,
  revision = 0,
  syncMessage,
  syncBusy,
  onSync,
  onOpen,
}: {
  products: ProductRow[];
  revision?: number;
  syncMessage: string;
  syncBusy: boolean;
  onSync: () => void;
  onOpen: (o: OrderRow) => void;
}) {
  const [channel, setChannel] = useState("all"),
    [status, setStatus] = useState("Bekliyor"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrderRow[]>([]),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [ty, setTy] = useState<Packages | null>(null),
    [tyLoading, setTyLoading] = useState(false),
    [tyError, setTyError] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    if (channel === "trendyol") return;
    const c = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      setOrders([]);
      setTotal(0);
      try {
        const r = await fetch(
          "/api/admin/lists?" +
            new URLSearchParams({
              resource: "orders",
              page: String(page),
              limit: "25",
              status,
              q: query,
            }),
          { signal: c.signal, cache: "no-store" },
        );
        const d = await r.json();
        if (!r.ok) throw Error(failure(r, d.error));
        if (!c.signal.aborted) {
          setOrders(d.items);
          setTotal(d.total);
        }
      } catch (e) {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : "Siparişler alınamadı.");
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [channel, status, query, page, revision]);
  useEffect(() => () => controller.current?.abort(), []);
  const loadTy = useCallback(
    async (nextPage = 0) => {
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      setTyLoading(true);
      setTyError("");
      try {
        const r = await fetch(
          "/api/admin/trendyol/archive?" +
            new URLSearchParams({ page: String(nextPage), status, q: query }),
          { signal: c.signal, cache: "no-store" },
        );
        const d = await r.json();
        if (!r.ok) throw Error(failure(r, d.error));
        if (!c.signal.aborted) setTy(d);
      } catch (e) {
        if (!c.signal.aborted)
          setTyError(
            e instanceof Error ? e.message : "Trendyol bağlantısı kurulamadı.",
          );
      } finally {
        if (!c.signal.aborted) setTyLoading(false);
      }
    },
    [status, query],
  );
  useEffect(() => {
    if (channel === "store") return;
    const timer = setTimeout(() => void loadTy(), 200);
    return () => {
      clearTimeout(timer);
      controller.current?.abort();
    };
  }, [channel, loadTy, revision]);
  const storeRows =
    channel === "trendyol"
      ? []
      : orders.map((o) => {
          const items = parseOrderItems(o.items),
            first = items[0];
          return {
            key: `store-${o.id}`,
            number: o.order_no || `#${o.id}`,
            name: first?.name || "Ürün detayı",
            image: first?.image || first?.images?.[0],
            date: new Date(o.created_at).getTime(),
            amount: Number(o.total_amount),
            currency: "TRY",
            customer: getOrderCustomerName(o.shipping_address),
            status: stateLabel(o.status),
            source: "Mağaza",
            open: () => onOpen(o),
            note: items.length > 1 ? `+${items.length - 1} ürün` : "",
            payment:
              o.payment_status === "refunded"
                ? "İade edildi"
                : o.payment_status === "partially_refunded"
                  ? "Kısmi iade"
                  : "Ödendi",
          };
        });
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  const tyRows =
    channel === "store"
      ? []
      : (ty?.packages || [])
          .filter(
            (p) =>
              (status === "all" || tyStates[p.status] === status) &&
              (!needle ||
                [
                  p.orderNumber,
                  ...p.lines.map((l) => l.name),
                  ...p.lines.map((l) => l.sku),
                ].some((v) => v.toLocaleLowerCase("tr-TR").includes(needle))),
          )
          .map((p) => {
            const product = products.find((x) => x.SKU === p.lines[0]?.sku);
            return {
              key: `ty-${p.packageId}`,
              number: p.orderNumber,
              name: p.lines[0]?.name || "Paket detayı",
              image: product?.images?.[0] || product?.image,
              date: p.orderDate,
              amount: p.amount,
              currency: p.currency,
              customer: "Trendyol müşterisi",
              status: stateLabel(tyStates[p.status] || p.status),
              source: "Trendyol",
              open: () => setSelected(p.packageId),
              note: `Paket #${p.packageId}`,
              payment: "",
            };
          });
  const rows = [...storeRows, ...tyRows].sort(
    (a, b) => b.date - a.date || a.key.localeCompare(b.key),
  );
  const pkg = ty?.packages.find((p) => p.packageId === selected);
  const visibleError = [
    channel !== "trendyol" && error,
    channel !== "store" && tyError,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      <section className={s.filterPanel} aria-label="Sipariş filtreleri">
        <div className={`${s.row} ${s.spread}`}>
          <div className={s.segmented} role="group" aria-label="Satış kanalı">
            {[
              ["all", "Tümü"],
              ["store", "Mağaza"],
              ["trendyol", "Trendyol"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={channel === key}
                onClick={() => {
                  setChannel(key);
                  setPage(1);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {channel !== "store" && (
            <button
              className={s.button}
              disabled={tyLoading || syncBusy}
              onClick={() => {
                void loadTy();
                onSync();
              }}
            >
              {syncBusy ? "Siparişler güncelleniyor…" : tyLoading ? "Arşiv yükleniyor…" : "Yeni siparişleri kontrol et"}
            </button>
          )}
        </div>
        <div className={s.tabs} role="group" aria-label="Sipariş durumu">
          {states.map(([key, label]) => (
            <button
              key={key}
              aria-pressed={status === key}
              onClick={() => {
                setStatus(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={s.toolbar}>
          <input
            type="search"
            aria-label="Sipariş ara"
            placeholder="Sipariş numarası veya müşteri e-postası ara"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <span className={s.badge}>{rows.length} kayıt gösteriliyor</span>
        </div>
        {channel !== "store" && (
          <p className={s.muted}>
            {ty
              ? `Trendyol arşivi: ${ty.total} eşleşen paket. Sayfa ${ty.page + 1}/${Math.max(1, ty.totalPages)}. `
              : "Kayıtlı Trendyol siparişleri yükleniyor. "}
            {syncMessage}{" "}
            {channel === "all" &&
              "Yüklenen mağaza ve Trendyol sayfaları tarihe göre birlikte sıralanır."}
          </p>
        )}
      </section>
      {visibleError && (
        <div className={s.error} role="alert">
          {visibleError}
          {visibleError.includes("Oturumunuz") && (
            <a className={s.button} href="/admin/login">
              Yeniden giriş yap
            </a>
          )}
        </div>
      )}
      <section
        className={`${s.panel} ${s.table} ${s.orderTable}`}
        aria-label="Sipariş listesi"
      >
        <table>
          <thead>
            <tr>
              {[
                "Ürün / sipariş",
                "Müşteri",
                "Tutar",
                "Durum",
                "Satış kanalı",
              ].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} onClick={r.open} style={{ cursor: "pointer" }}>
                <td>
                  <div className={s.orderProduct}>
                    {r.image ? (
                      <Image
                        width={60}
                        height={70}
                        className={s.thumb}
                        src={sanitizeImageUrl(r.image)}
                        alt={r.name}
                      />
                    ) : (
                      <span
                        className={s.imagePlaceholder}
                        aria-label="Ürün görseli yok"
                      >
                        ◇
                      </span>
                    )}
                    <div>
                      <button
                        className={s.link}
                        onClick={(e) => {
                          e.stopPropagation();
                          r.open();
                        }}
                        aria-haspopup="dialog"
                      >
                        {r.number}
                      </button>
                      <p>{r.name}</p>
                      <small className={s.muted}>
                        {new Date(r.date).toLocaleString("tr-TR")}
                        {r.note && ` · ${r.note}`}
                      </small>
                    </div>
                  </div>
                </td>
                <td>{r.customer}</td>
                <td className={s.amount}>
                  {r.amount.toLocaleString("tr-TR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  {r.currency === "TRY" ? "₺" : r.currency}
                </td>
                <td>
                  <span className={s.badge}>{r.status}</span>
                  {r.payment && <p className={s.muted}>{r.payment}</p>}
                </td>
                <td>
                  <span
                    className={`${s.badge} ${r.source === "Trendyol" ? s.trendyol : ""}`}
                  >
                    {r.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {((loading && channel !== "trendyol") ||
          (tyLoading && channel !== "store")) && (
          <p className={s.emptyState} role="status">
            Siparişler yükleniyor…
          </p>
        )}
        {!loading && !tyLoading && !rows.length && !visibleError && (
          <div className={s.emptyState}>
            <strong>Bu filtrede sipariş bulunamadı</strong>
            <p>
              Durumu veya satış kanalını değiştirerek diğer siparişleri
              görebilirsiniz.
            </p>
          </div>
        )}
      </section>
      {channel !== "trendyol" && (
        <div aria-label="Mağaza sayfaları">
          <p className={s.muted}>Mağaza · {total} eşleşen sipariş</p>
          <AdminPagination
            page={page}
            pageSize={25}
            total={total}
            loading={loading}
            onPageChange={setPage}
          />
        </div>
      )}
      {channel !== "store" && ty && (
        <div className={s.toolbar} aria-label="Trendyol sayfaları">
          <span className={s.muted}>
            Trendyol · paket sayfası {ty.page + 1}
          </span>
          <button
            className={s.button}
            disabled={tyLoading || ty.page === 0}
            onClick={() => void loadTy(ty.page - 1)}
          >
            Önceki
          </button>
          <button
            className={s.button}
            disabled={tyLoading || !ty.hasNext}
            onClick={() => void loadTy(ty.page + 1)}
          >
            Sonraki
          </button>
        </div>
      )}
      {pkg && channel !== "store" && (
        <TrendyolOrderDetail pkg={pkg} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
