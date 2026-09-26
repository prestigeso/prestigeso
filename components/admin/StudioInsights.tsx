"use client";
import { useEffect, useState } from "react";
import type { buildAnalyticsReport } from "@/lib/analytics/report";
import StudioTrendChart from "./StudioTrendChart";
import s from "./StudioInsights.module.css";
type Report = ReturnType<typeof buildAnalyticsReport> & {
  catalog?: Record<string, { name: string; sku: string }>;
  coverage?: string;
  trendyolArchive?: { complete: boolean; firstAvailableAt: number | null };
};
type Mode = "performance" | "marketing" | "finance";
const fmt = (n: number) =>
  n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const sourceNames: Record<string, string> = {
  direct: "Doğrudan",
  search: "Arama motorları",
  social: "Sosyal medya",
  internal: "Site içi",
  other: "Diğer",
};
export default function StudioInsights({
  mode,
  active = true,
}: {
  mode: Mode;
  active?: boolean;
}) {
  const [days, setDays] = useState("28"),
    [report, setReport] = useState<Report | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [metric, setMetric] = useState(mode === "finance" ? "gross" : "sessions"),
    [tab, setTab] = useState("overview");
  useEffect(() => {
    if (!active) return;
    const c = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true);
      setError("");
      setReport(null);
      fetch(
        mode === 'finance' ? `/api/admin/finance/summary?days=${days}` : `/api/admin/analytics?days=${days}&device=all&source=all&traffic=normal&audience=all`,
        { signal: c.signal, cache: "no-store" },
      )
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw Error(d.error || "Özet alınamadı.");
          if (!c.signal.aborted) setReport(d);
        })
        .catch((e) => {
          if (!c.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!c.signal.aborted) setBusy(false);
        });
    }, 0);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [days, revision, active, mode]);
  const finance = report?.finance;
  const cards =
    mode === "finance"
      ? [
          {
            label: "Satış tutarı",
            value: finance ? `${fmt(finance.gross)} ₺` : null,
            note: "Mağaza ve Trendyol satışları",
            key: "gross",
          },
          {
            label: "İadeler",
            value: finance ? `${fmt(finance.refunds)} ₺` : null,
            note: "Mağazanın kayıtlı para iadeleri",
            key: "refunds",
          },
          {
            label: "İade sonrası tutar",
            value: finance ? `${fmt(finance.gross - finance.refunds)} ₺` : null,
            note: "Giderler düşülmedi · kâr değildir",
            key: "net",
          },
          {
            label: "Satış siparişi",
            value: finance ? fmt(finance.orders) : null,
            note: "Mağaza + Trendyol · paketler tekilleştirilir",
            key: "orders",
          },
        ]
      : mode === "marketing"
        ? [
            {
              label: "Ölçülen ziyaret",
              value: report ? fmt(report.current.sessions) : null,
              note: "İzinli oturumlar · tekil kişi değil",
              key: "sessions",
            },
            {
              label: "Aramadan gelen",
              value: report
                ? fmt(
                    report.sources?.find((x) => x.source === "search")
                      ?.sessions || 0,
                  )
                : null,
              note: "Arama motoru kaynaklı oturum",
              key: "search",
            },
            {
              label: "Sosyal medyadan",
              value: report
                ? fmt(
                    report.sources?.find((x) => x.source === "social")
                      ?.sessions || 0,
                  )
                : null,
              note: "Organik ve reklam ayrımı yapılmaz",
              key: "social",
            },
          ]
        : [
            {
              label: "Ziyaret",
              value: report ? fmt(report.current.sessions) : null,
              note: "Ölçülen oturum · tekil kişi değil",
              key: "sessions",
            },
            {
              label: "Ürün inceleyen",
              value: report ? fmt(report.current.viewed) : null,
              note: "Ürün görüntülenen oturumlar",
              key: "viewed",
            },
            {
              label: "Sepete ekleyen",
              value: report ? fmt(report.current.added) : null,
              note: "İncelemeden sonra ekleyen",
              key: "added",
            },
            {
              label: "Satın alan",
              value: report ? fmt(report.current.paid) : null,
              note: "Ölçülen adımları tamamlayan oturum",
              key: "paid",
            },
          ];
  const stages = report
    ? ([
        ["Ürün inceleme", report.current.viewed],
        ["Sepete ekleme", report.current.added],
        ["Ödemeye geçiş", report.current.checkout],
        ["Satın alma", report.current.paid],
      ] as const)
    : [];
  const drops = stages
    .slice(0, -1)
    .map(([label, value], i) => ({
      label: `${label} → ${stages[i + 1][0]}`,
      lost: value - stages[i + 1][1],
      percent: value ? ((value - stages[i + 1][1]) / value) * 100 : null,
    }))
    .filter((x) => x.percent !== null)
    .sort((a, b) => b.lost - a.lost);
  const selectedCard = cards.find((c) => c.key === metric) || cards[0];
  const chartRows =
    report?.series?.map((d) => ({
      label: new Date(d.timestamp).toLocaleString("tr-TR", {
        timeZone: "Europe/Istanbul",
        day: "2-digit",
        month: "short",
        ...(Number(days) >= 365 ? { year: "numeric" } : {}),
        ...(report.granularity === "hour"
          ? { hour: "2-digit", minute: "2-digit" }
          : {}),
      }),
      value:
        metric === "net"
          ? d.gross - d.refunds
          : Number(d[metric as keyof typeof d] ?? 0),
      previous: null,
    })) || [];
  return (
    <div className={s.insights}>
      <div className={s.toolbar}>
        <div className={s.reportTabs} role="group" aria-label="Analiz görünümü">
          <button
            aria-pressed={tab === "overview"}
            onClick={() => setTab("overview")}
          >
            Genel bakış
          </button>
          <button
            aria-pressed={tab === "details"}
            onClick={() => setTab("details")}
          >
            {mode === "performance"
              ? "Ürünler ve dönüşüm"
              : mode === "marketing"
                ? "Trafik kaynakları"
                : "Satış dökümü"}
          </button>
        </div>
        <label>
          Dönem
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            {[
              ["1", "Son 24 saat"],
              ["2", "Son 48 saat"],
              ["7", "Son 7 gün"],
              ["14", "Son 14 gün"],
              ["28", "Son 28 gün"],
              ["30", "Son 30 gün"],
              ["90", "Son 90 gün"],
              ["365", "Son 365 gün"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy} onClick={() => setRevision((n) => n + 1)}>
          Yenile
        </button>
      </div>
      {report && (
        <p className={s.dateRange}>
          {new Date(report.from).toLocaleDateString("tr-TR")} –{" "}
          {new Date(report.generatedAt).toLocaleDateString("tr-TR")} ·{" "}
          {Number(days) <= 2 ? "Saatlik görünüm" : "Günlük görünüm"}
        </p>
      )}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      {mode === 'finance' && report && <p className={s.callout}>{report.trendyolArchive?.complete === false ? 'Trendyol arşivi seçili dönemi tam kapsamıyor; ciro ve sipariş sayısı yalnız kayıtlı geçmişi gösterir. Eksik günler sıfır satış değildir. ' : ''}Mağaza ve Trendyol birlikte gösterilir. Trendyol para iadesi mutabakatı ve komisyonlar henüz düşülmedi; sonuç banka tahsilatı veya net kâr değildir.</p>}
      <div className={s.cards} hidden={tab !== "overview"}>
        {cards.map((c) => (
          <button
            className={s.card}
            key={c.key}
            aria-pressed={metric === c.key}
            onClick={() => setMetric(c.key)}
          >
            <span>{c.label}</span>
            <strong>{busy ? "…" : (c.value ?? "Veri yok")}</strong>
            <small>{c.note}</small>
          </button>
        ))}
      </div>
      {busy && <p role="status">Özet hazırlanıyor…</p>}
      {!busy && report && (
        <>
          <section
            className={`${s.panel} ${s.chartPanel}`}
            hidden={tab !== "overview"}
          >
            <div className={s.panelHead}>
              <div>
                <h2>{selectedCard.label}</h2>
                <p>
                  {Number(days) <= 2 ? "Saatlik değişim" : "Günlük değişim"}{" "}
                  <span className={s.badge}>
                    {mode === "finance"
                      ? "Mağaza + Trendyol"
                      : "Ölçülen oturumlar"}
                  </span>
                </p>
              </div>
            </div>
            {chartRows.length ? (
              <StudioTrendChart
                compact
                studio
                key={`${days}-${metric}`}
                unit={
                  selectedCard.label +
                  (mode === "finance" && metric !== "orders" ? " (₺)" : "")
                }
                rows={chartRows}
              />
            ) : (
              <p>Günlük dağılım henüz alınamadı.</p>
            )}
          </section>
          <div className={s.columns}>
            {mode === "performance" ? (
              <>
                <section className={s.panel}>
                  <h2>Alışverişin hangi aşamasındalar?</h2>
                  <p>Aynı oturumda, sırayla gerçekleşen adımlar</p>
                  <div className={s.bars}>
                    {stages.map(([label, value]) => (
                      <div key={label}>
                        <span>
                          {label}
                          <b>{fmt(value)}</b>
                        </span>
                        <progress
                          aria-label={label}
                          max={Math.max(1, report.current.viewed)}
                          value={value}
                        />
                      </div>
                    ))}
                  </div>
                  <p className={s.callout}>
                    {drops[0]?.lost
                      ? `En fazla azalma: ${drops[0].label}. ${fmt(drops[0].lost)} oturum sonraki adıma geçmedi (%${fmt(drops[0].percent!)}).`
                      : "Belirgin bir aşama kaybı gösterecek veri yok."}{" "}
                    Ayrılma nedeni bu veriden bilinmez.
                  </p>
                </section>
                <section className={s.panel}>
                  <h2>En çok ilgi gören ürünler</h2>
                  <p>İlk 5 ürün · görüntüleme sayısına göre</p>
                  {report.products.length ? (
                    <ol className={s.list}>
                      {report.products.slice(0, 5).map((p, i) => (
                        <li key={p.id}>
                          <span className={s.rank}>{i + 1}</span>
                          <div>
                            <strong>
                              {report.catalog?.[String(p.id)]?.name ||
                                `Ürün #${p.id}`}
                            </strong>
                            <small>{fmt(p.adds)} sepete ekleme olayı</small>
                          </div>
                          <b>
                            {fmt(p.views)}
                            <small>inceleme</small>
                          </b>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <div className={s.empty}>
                      <span aria-hidden="true">↗</span>
                      <strong>Ürünler burada sıralanacak</strong>
                      <p>
                        Seçili dönemde henüz ürün etkileşimi yok. Görüntüleme
                        geldikçe en çok ilgi gören 5 ürünü burada göreceksin.
                      </p>
                    </div>
                  )}
                </section>
              </>
            ) : mode === "marketing" ? (
              <>
                <section className={s.panel}>
                  <h2>Ziyaret kaynakları</h2>
                  <p>Ölçülen oturumların giriş kaynağı</p>
                  <div className={s.bars}>
                    {report.sources?.map((x) => (
                      <div key={x.source}>
                        <span>
                          {sourceNames[x.source] || x.source}
                          <b>
                            {fmt(x.sessions)} · %
                            {fmt(
                              report.current.sessions
                                ? (x.sessions / report.current.sessions) * 100
                                : 0,
                            )}
                          </b>
                        </span>
                        <progress
                          aria-label={sourceNames[x.source] || x.source}
                          max={Math.max(1, report.current.sessions)}
                          value={x.sessions}
                        />
                      </div>
                    ))}
                  </div>
                  {!report.sources?.length && (
                    <div className={s.empty}>
                      <span aria-hidden="true">↗</span>
                      <strong>Ziyaret kaynakları bekleniyor</strong>
                      <p>Seçili dönemde kaynak dağılımı için henüz veri yok.</p>
                    </div>
                  )}
                </section>
                <section className={s.panel}>
                  <h2>Satın almayla eşleşen ziyaretler</h2>
                  <p>Kaynak, satışa neden olduğunu kanıtlamaz.</p>
                  <ol className={s.list}>
                    {report.sources?.map((x) => (
                      <li key={x.source}>
                        <strong>{sourceNames[x.source] || x.source}</strong>
                        <b>
                          {fmt(x.linkedPaidSessions)}
                          <small>eşleşen oturum</small>
                        </b>
                      </li>
                    ))}
                  </ol>
                  <p className={s.callout}>
                    Reklam harcaması ve doğrulanmış reklam eşleştirmesi olmadan
                    reklam getirisi hesaplanmaz. Google aramalarını ve
                    kampanyalarını aşağıdan inceleyebilirsin.
                  </p>
                </section>
              </>
            ) : (
              <>
                <section className={s.panel}>
                  <h2>Satış tutarından ne kaldı?</h2>
                  <dl className={s.breakdown}>
                    <div>
                      <dt>Satış tutarı</dt>
                      <dd>{fmt(report.finance.gross)} ₺</dd>
                    </div>
                    <div>
                      <dt>Kayıtlı iadeler</dt>
                      <dd>− {fmt(report.finance.refunds)} ₺</dd>
                    </div>
                    <div>
                      <dt>Gider öncesi kalan</dt>
                      <dd>
                        {fmt(report.finance.gross - report.finance.refunds)} ₺
                      </dd>
                    </div>
                  </dl>
                  <p>
                    İadeler, seçili dönemdeki satışlara aittir; iade işlem
                    tarihine göre rapor değildir.
                  </p>
                </section>
                <section className={s.panel}>
                  <h2>Kârı neden henüz göstermiyoruz?</h2>
                  <p>
                    Kargo, ürün maliyeti, vergi, komisyon ve reklam giderlerinin
                    dönem toplamı bu raporda bulunmuyor. Eksik tutarları sıfır
                    saymıyoruz.
                  </p>
                  <p className={s.callout}>
                    Kayıtlı maliyetleri kontrol etmek için aşağıdaki “Sipariş
                    katkısı” aracını aç. Fiyat denemeleri gerçek satış
                    tutarlarını değiştirmez.
                  </p>
                </section>
              </>
            )}
          </div>
          <details className={s.method}>
            <summary>Veri kapsamı ve güncelleme</summary>
            <p>
              {mode === "finance"
                ? (report.coverage || "Mağaza + Trendyol. Arşivde bulunan kayıtlar gösterilir; eksik geçmiş sıfır satış anlamına gelmez.")
                : "Yalnız izinli ve normal trafik olarak sınıflanan oturumlar. Tüm ziyaretçileri kapsamaz; kişi sayısı değildir."}{" "}
              Güncelleme: {new Date(report.generatedAt).toLocaleString("tr-TR")}
              . Grafik Türkiye takvimini kullanır; ilk ve son gün kısmi
              olabilir. Kayıt olmayan günlerde sıfır, ölçüm kapsamındaki kayıt
              sayısını belirtir; ölçümün kesintisiz çalıştığını garanti etmez.
            </p>
          </details>
        </>
      )}
    </div>
  );
}
