"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./AdminDesign.module.css";
import type { buildAnalyticsReport, EventRow } from "@/lib/analytics/report";
type Report = ReturnType<typeof buildAnalyticsReport> & { timeline: EventRow[]; timelineTotal: number; catalog?: Record<string, { name: string; sku: string }> };
const number = (n: number | null) => n === null ? "Veri yok" : n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const ratio = (r: { numerator: number; denominator: number; percent: number | null }) => `${r.percent === null ? "Veri yok" : `%${number(r.percent)}`} (${r.numerator}/${r.denominator})`;
const labels: Record<string, string> = { paid: "Ödendi", pending: "Sonuç bekliyor", payment_pending: "Ödeme bekliyor", abandoned: "Terk edilmiş", open: "Açık", empty: "Boşaltılmış", failed: "Başarısız — neden ayrıca doğrulanmalı", unknown: "Bilinmiyor", hero: "Ana vitrin", category: "Kategori", products: "Ürün blokları", technical: "Teknik hata", validation: "Doğrulama", otp: "E-posta doğrulama", rejected: "Sağlayıcı reddi", cart: "Sepet", identity: "Alışveriş yöntemi", address: "Adres", contract: "Sözleşme", payment: "Ödeme başlatma", begin_checkout: "Checkout açıldı", payment_attempt: "Ödeme girişimi", no_checkout_step: "Checkout adımı gözlenmedi", product_view: "Ürün incelendi", product_click: "Ürün kartına tıklandı", add_cart: "Sepete eklendi", remove_cart: "Sepetten çıkarıldı", update_cart: "Sepet miktarı değişti", category_view: "Kategori incelendi", page_view: "Sayfa açıldı", active_time: "Etkin süre örneği", list_impression: "Ürün kartı gösterildi", block_impression: "Blok gösterildi", block_click: "Blok tıklandı", search: "Arama", filter: "Filtre kullanıldı", checkout_error: "Checkout hatası" };
export default function AnalyticsDashboard({ embedded = false }: { embedded?: boolean }) {
  const [filters, setFilters] = useState({ days: "7", device: "all", source: "all", traffic: "normal", audience: "all" });
  const [visitor, setVisitor] = useState("");
  const [journeyPage, setJourneyPage] = useState(0), [timelinePage, setTimelinePage] = useState(0);
  const [report, setReport] = useState<Report | null>(null), [error, setError] = useState("");
  const [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0);
  const [tab, setTab] = useState("overview");
  const productLabel = (id: number) => { const product = report?.catalog?.[String(id)]; return product ? `${product.name} (${product.sku})` : `#${id}`; };
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/admin/analytics?${new URLSearchParams({ ...filters, ...(visitor ? { visitor, timelinePage: String(timelinePage) } : {}) })}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Rapor alınamadı.");
        setReport(data);
      } catch (e) { if (!controller.signal.aborted) { setReport(null); setError(e instanceof Error ? e.message : "Bağlantı hatası."); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load(); return () => controller.abort();
  }, [filters, visitor, timelinePage, refresh]);
  const lastJourneyPage = Math.max(0, Math.ceil((report?.journeys.length || 0) / 50) - 1);
  const currentJourneyPage = Math.min(journeyPage, lastJourneyPage);
  const options = {
    days: [["1", "Son 24 saat"], ["7", "Son 7 gün"], ["14", "Son 14 gün"], ["30", "Son 30 gün"]],
    device: [["all", "Tüm cihazlar"], ["android", "Android"], ["ios", "iOS/iPadOS tanınan"], ["desktop_other", "Masaüstü / diğer"]],
    source: [["all", "Tüm giriş kaynakları"], ["direct", "Doğrudan / referans yok"], ["search", "Arama motoru"], ["social", "Sosyal"], ["internal", "Site içi"], ["other", "Diğer"]],
    traffic: [["normal", "Normal görünen trafik"], ["all", "Filtrelenmemiş"], ["staff", "Admin oturumlu"], ["suspected", "Bot şüphesi"]],
    audience: [["all", "Tüm ölçülebilen oturumlar"], ["new", "İlk gözlenen oturum"], ["returning", "Geri dönen (30 gün)"]],
  };
  const tabs = [["overview", "Genel"], ["discovery", "Ürün & keşif"], ["home", "Ana sayfa"], ["carts", "Sepet & ödeme"], ["journeys", "Yolculuklar"], ["quality", "Veri kalitesi"]];
  return <div className={`${styles.report} ${embedded ? styles.embedded : "min-h-screen p-4 md:p-8"}`}>
    <div className="max-w-7xl mx-auto space-y-5">
      <header className="bg-white rounded-2xl border p-6">{!embedded && <><Link href="/admin/analysis" className="text-sm underline">← Finans ve eski sayaçlar</Link><h1 className="text-2xl font-black mt-3">Mağaza yolculuğu analizi</h1></>}<details><summary>Bu rapor neyi ölçüyor?</summary><p className="text-sm text-gray-600 mt-2">İzinli ve takma kimlikli ölçüm. Gerçek kişi sayısı veya tüm ziyaretlerin eksiksiz kaydı değildir. Oturum: 30 dakika hareketsizlik; sepet terki: 24 saat; ham veri: 30 gün.</p></details></header>
      <section className="flex flex-wrap gap-3" aria-label="Rapor filtreleri">{Object.entries(options).map(([key, values]) => <label key={key} className="text-xs">{({ days: "Dönem", device: "Cihaz", source: "Kaynak", traffic: "Trafik", audience: "Ziyaret" } as Record<string, string>)[key]}<select className="block rounded-lg border p-2 bg-white max-w-full" value={filters[key as keyof typeof filters]} onChange={(e) => { setVisitor(""); setFilters((f) => ({ ...f, [key]: e.target.value })); }}>{values.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}<button onClick={() => setRefresh((n) => n + 1)} className="border rounded-lg px-4 bg-white" disabled={loading}>Yenile</button></section>
      <nav className="flex flex-wrap gap-2" aria-label="Analiz bölümleri">{tabs.map(([key, name]) => <button key={key} onClick={() => setTab(key)} aria-pressed={tab === key} className={`px-4 py-2 rounded-xl ${tab === key ? "bg-black text-white" : "bg-white border"}`}>{name}</button>)}</nav>
      {loading ? <p role="status">Rapor hazırlanıyor…</p> : error ? <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4">{error}</p> : report && <>
        <p className="text-xs text-gray-600">Rapor: {new Date(report.generatedAt).toLocaleString("tr-TR")} · Son olay: {report.quality.lastEvent ? new Date(report.quality.lastEvent).toLocaleString("tr-TR") : "Henüz yok"}. Eski sayaçlar bu rapora dönüştürülmez.</p>
        {tab === "journeys" && <section><h2 className="font-bold mb-2">Ziyaretçi bazında — seçili oturumlar</h2><Table headings={["Takma kimlik", "Farklı ürün", "Farklı kategori", "Ürün → sepet", "Sepet → ödeme", "İlk bakış → ekleme ort. sn"]} rows={report.visitors.map((v) => [v.visitorId.slice(0, 8), v.distinctProducts, v.distinctCategories, ratio(v.productToCart), ratio(v.cartToPaid), number(v.averageSecondsToAdd)])} /><p className="text-xs mt-2">Süreler sunucuya varış zamanına dayanır; kuyruk/ağ gecikmesi içerebilir. Ziyaretçi oranlarının ortalaması mağaza dönüşümü olarak kullanılmaz.</p></section>}
        {tab === "overview" && <>
          <section className={styles.metrics} aria-label="Oturum özeti">{([['sessions', 'Oturum'], ['viewed', 'Ürün inceleyen'], ['added', 'İnceleyip ekleyen'], ['checkout', 'Sonra checkout'], ['paid', 'Zinciri tamamlayıp ödeyen']] as const).map(([key, label]) => <div key={key} className={styles.metric}><h2>{label}</h2><strong>{number(report.current[key])}</strong><p>Önceki dönem: {number(report.previous[key])}</p></div>)}</section>
          <section className="bg-white border rounded-xl p-5 space-y-2"><h2 className="font-bold">Sıralı oturum hunisi</h2><p>Ürün → sepet: {ratio(report.current.viewToCart)}</p><p>Sepet → checkout: {ratio(report.current.cartToCheckout)}</p><p>Sepet → ödenmiş: {ratio(report.current.cartToPaid)}</p><p>Checkout → ödenmiş: {ratio(report.current.checkoutToPaid)}</p><p>Bağlanabilen tüm ödenmiş oturumlar: {report.current.linkedPaidSessions}. Eksik önceki adımlar hunide varsayılmaz.</p></section>
          <section className="bg-amber-50 border rounded-xl p-5"><h2 className="font-bold">Finans — davranış filtresinden bağımsız</h2><p>Dönemde tahsilatı doğrulanan {report.finance.orders} sipariş · Brüt {number(report.finance.gross)} ₺ · Bu siparişlerin kayıtlı iadeleri {number(report.finance.refunds)} ₺</p><p>Davranış bağlantısı bulunmayan: {report.finance.unmeasuredOrders}. Bu toplam, izinli oturumlara bölünerek dönüşüm oranı yapılmaz.</p></section>
        </>}
        {tab === "discovery" && <>
          <section className="bg-white border rounded-xl p-5"><h2 className="font-bold">Keşif derinliği</h2><p>Oturum başına farklı ürün: {number(report.discovery.averageProducts)} · farklı kategori: {number(report.discovery.averageCategories)} (hiç incelemeyenler dahil).</p><p>Toplam ürün incelemesi: {report.discovery.productViews} · tekrar: {report.discovery.repeatViews} · etkin süre örnekleri: {report.discovery.activeSeconds} saniye.</p><p>Arama: {report.discovery.searches} · sonuçsuz: {report.discovery.zeroResultSearches}. Arama metni tutulmaz.</p></section>
          <Table headings={["Ürün / SKU", "Görüntüleme", "Kart gösterimi", "Tıklama", "Ekleme olayı"]} rows={report.products.map((p) => [productLabel(p.id), p.views, p.impressions, p.clicks, p.adds])} />
          <h2 className="font-bold">İlk 5 farklı görüntülenen ürün — sıra kapsamı</h2><Table headings={["Sıra", "Ürün", "Oturum", "Sonra ekleyen oturum"]} rows={report.discovery.ranks.map((r) => [r.rank, productLabel(r.productId), r.sessions, r.addedAfterView])} />
          <h2 className="font-bold">Ürünler arası geçiş</h2><Table headings={["Ürün ID geçişi", "Adet"]} rows={Object.entries(report.discovery.transitions)} />
        </>}
        {tab === "home" && <section className="space-y-4"><p>Ana sayfadan başlayan {report.home.sessions} oturum · ürün inceleyen {report.home.viewed} · ekleyen {report.home.added} · checkout {report.home.checkout} · sıralı satış {report.home.paid}. Doğrudan ürün girişleri burada yok.</p><Table headings={["Blok", "Gösterim", "Tıklama", "Tıklayıp sonra ekleyen oturum"]} rows={Object.entries(report.blocks).map(([b, v]) => [labels[b] || b, v.impressions, v.clicks, v.sessionsWithLaterAdd])} /><p className="text-xs">Gösterim: bloğun en az yarısı görünür. Sonradan ekleme bir ilişki ölçümüdür; bloğun satışa neden olduğunu kanıtlamaz.</p></section>}
        {tab === "carts" && <><Table headings={["Sepet (takma)", "Durum", "Gözlenen farklı satır", "Checkout", "Son hareket"]} rows={report.carts.map((c) => [c.cartId.slice(0, 8), labels[c.state], c.distinctLines, c.checkout ? "Evet" : "Hayır", new Date(c.lastSeen).toLocaleString("tr-TR")])} /><h2 className="font-bold">Gözlenen ödeme adımı hataları</h2><Table headings={["Sınıf", "Olay"]} rows={Object.entries(report.errors).map(([k, v]) => [labels[k] || k, v])} /><p className="text-sm">Pencere öncesi sepet içeriği bilinmeyebilir. Sağlayıcı ekranındaki hareket izlenmez; ayrılma sebebi bilinmiyorsa tahmin edilmez.</p></>}
        {tab === "journeys" && <>
          <p className="text-sm">İlk gözlenen ziyaret sırası yalnız saklanan 30 gün içindedir. İlk ürün görüntülemeleri ve kart tıklamaları farklıdır.</p>
          <div className="space-y-2">{report.journeys.slice(currentJourneyPage * 50, currentJourneyPage * 50 + 50).map((j) => <button key={j.id} onClick={() => { setVisitor(j.visitor_id); setTimelinePage(0); }} className="block w-full text-left border rounded-xl p-3 bg-white"><strong>{j.visitor_id.slice(0, 8)} · {j.observedVisitNumber}. gözlenen oturum</strong><p className="text-sm">İlk ürünler: {j.firstProducts.map(productLabel).join(", ") || "Yok"} · İlk tıklamalar: {j.firstClicks.map(productLabel).join(", ") || "Yok"}</p><p className="text-sm">Ürün → sepet {ratio(j.productToCart)} · Son adım: {labels[j.lastStep] || j.lastStep} · Ödeme: {labels[j.paymentOutcome]}</p></button>)}</div>
          {lastJourneyPage > 0 && <div className="flex gap-3"><button disabled={!currentJourneyPage} onClick={() => setJourneyPage(currentJourneyPage - 1)}>Önceki oturumlar</button><span>{currentJourneyPage + 1}/{lastJourneyPage + 1}</span><button disabled={currentJourneyPage === lastJourneyPage} onClick={() => setJourneyPage(currentJourneyPage + 1)}>Sonraki oturumlar</button></div>}
          {visitor && <section><h2 className="font-bold">Seçili takma ziyaretçi: {visitor.slice(0, 8)}</h2><p>Geçmiş paketi {timelinePage + 1} · {report.timeline.length} / toplam {report.timelineTotal} olay (saklama penceresi; filtrelerden bağımsız).</p><Table headings={["Zaman", "Olay / adım", "Ürün", "Varyant"]} rows={report.timeline.map((e) => [new Date(e.received_at).toLocaleString("tr-TR"), labels[e.payload.step || e.payload.type] || e.payload.type, e.payload.productId ? productLabel(e.payload.productId) : "—", e.payload.variantId || "—"])} /><div className="flex gap-3 mt-2"><button className="border rounded px-3 py-1 disabled:opacity-40" disabled={!timelinePage} onClick={() => setTimelinePage((p) => p - 1)}>Önceki 500 olay</button><button className="border rounded px-3 py-1 disabled:opacity-40" disabled={(timelinePage + 1) * 500 >= report.timelineTotal} onClick={() => setTimelinePage((p) => p + 1)}>Sonraki 500 olay</button></div></section>}
        </>}
        {tab === "quality" && <section className="bg-white border rounded-xl p-5 space-y-2"><h2 className="font-bold">Kapsam ve sınırlamalar</h2><p>Filtrelenmemiş oturum: {report.quality.unfilteredSessions} · admin oturumlu: {report.quality.staff} · bot şüphesi: {report.quality.suspected} · seçili olay: {report.quality.measuredEvents}</p><p>İzin vermeyen, engelleyici kullanan, ağda kaybolan olaylar ve farklı cihazlar eksik kapsama yol açar. Bot sınıflandırması kesin değildir.</p><p>Tekrarlı event ID veritabanında tekilleştirilir. Gönderilemeyen olaylar sonradan uydurulmaz. Veri yok, sıfır satış anlamına gelmez.</p><p>Önceki dönem: {report.quality.previousPeriodComplete ? "Saklama penceresi içinde; kurulum tarihinden önce veri olmayabilir." : "30 günlük saklama nedeniyle eksik; tam karşılaştırma yapılamaz."}</p><p>Etkin süre: görünür sekmede, son kullanıcı hareketinden itibaren en fazla 60 saniye. Okuma veya memnuniyet kanıtı değildir.</p></section>}
      </>}
    </div>
  </div>;
}
function Table({ headings, rows }: { headings: string[]; rows: (string | number)[][] }) {
  const [page, setPage] = useState(0);
  const lastPage = Math.max(0, Math.ceil(rows.length / 50) - 1), currentPage = Math.min(page, lastPage);
  return <section><div className="overflow-x-auto bg-white border rounded-xl"><table className="w-full text-sm text-left"><thead><tr>{headings.map((h) => <th key={h} className="p-3 border-b whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.slice(currentPage * 50, currentPage * 50 + 50).map((row, i) => <tr key={i}>{row.map((v, j) => <td key={j} className="p-3 border-b">{v}</td>)}</tr>) : <tr><td colSpan={headings.length} className="p-4 text-gray-500">Bu kapsamda henüz veri yok.</td></tr>}</tbody></table></div>{rows.length > 50 && <div className="flex gap-3 items-center text-sm py-2"><button className="border rounded px-2" disabled={!currentPage} onClick={() => setPage(currentPage - 1)}>Önceki</button><span>{currentPage + 1}/{lastPage + 1} · {rows.length} satır</span><button className="border rounded px-2" disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Sonraki</button></div>}</section>;
}
