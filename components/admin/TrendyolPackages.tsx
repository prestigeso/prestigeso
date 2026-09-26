"use client";
import { useRef, useState, useEffect } from "react";
import type { projectPackages } from "@/lib/trendyol/packages";
type Result = ReturnType<typeof projectPackages> & { environment: string; fetchedAt: string };
export default function TrendyolPackages() {
  const [result, setResult] = useState<Result | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const windowRef = useRef<{ start: number; end: number } | null>(null), request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const load = async (page: number, reset: boolean) => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    if (reset || !windowRef.current) { const end = Date.now(); windowRef.current = { start: end - days * 86400000, end }; }
    setLoading(true); setError(""); setResult(null);
    try { const response = await fetch(`/api/admin/trendyol/packages?${new URLSearchParams({ start: String(windowRef.current.start), end: String(windowRef.current.end), page: String(page) })}`, { cache: "no-store", signal: controller.signal }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Liste alınamadı."); if (!controller.signal.aborted) setResult(data); }
    catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Bağlantı hatası."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  };
  return <section className="border rounded-2xl bg-white p-5 space-y-4"><h2 className="text-xl font-bold">Trendyol sipariş paketleri — salt okunur</h2><p className="text-sm">Canlı bağlantı yalnız butona basınca denenir. Site siparişlerinden ayrıdır; stok düşürmez, iptal/iade/fatura işlemi yapmaz. Adres, telefon ve müşteri adı bu listeye aktarılmaz. Paket tutarı, site tahsilatı veya net kazanç değildir.</p>
    <div className="flex flex-wrap gap-3"><label>Aralık <select value={days} disabled={loading} onChange={(e) => { setDays(Number(e.target.value)); setResult(null); windowRef.current = null; }} className="border p-2 rounded"><option value={1}>Son 24 saat</option><option value={7}>Son 7 gün</option><option value={14}>Son 14 gün</option></select></label><button disabled={loading} onClick={() => void load(0, true)} className="rounded bg-black text-white px-4 py-2 disabled:opacity-50">{loading ? "Yükleniyor…" : "Trendyol paketlerini getir"}</button></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}{result && <><p>Ortam: {result.environment} · {new Date(result.fetchedAt).toLocaleString("tr-TR")} · {result.total} paket · Sayfa {result.page + 1}/{Math.max(1, result.totalPages)}</p><p className="text-xs">Paketler son değişiklik sırasındadır; okuma sırasında durum değişirse sayfalar kayabilir. Bu liste kalıcı senkronizasyon değildir.</p><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr>{["Sipariş / paket", "Durum", "Ürünler / SKU", "Paket tutarı"].map((h) => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{result.packages.map((p) => <tr key={p.packageId} className="border-t"><td className="p-2">{p.orderNumber}<br />{p.packageId}</td><td className="p-2">{p.status}</td><td className="p-2">{p.lines.map((line, index) => <div key={index}>{line.quantity} × {line.name} ({line.sku})</div>)}</td><td className="p-2">{p.amount.toLocaleString("tr-TR")} {p.currency}</td></tr>)}</tbody></table></div>{!result.packages.length && <p>Bu tarih aralığında paket bulunamadı.</p>}<div className="flex gap-3"><button className="border rounded px-3 py-2 disabled:opacity-40" disabled={result.page === 0 || loading} onClick={() => void load(result.page - 1, false)}>Önceki</button><button className="border rounded px-3 py-2 disabled:opacity-40" disabled={!result.hasNext || loading} onClick={() => void load(result.page + 1, false)}>Sonraki</button></div></>}
  </section>;
}
