"use client";
import { useEffect, useState } from "react";
import { StudioChart } from "./StudioOverview";
import s from "./OverviewSoft.module.css";
type Growth = {
  total: number;
  newCustomers: number;
  series: { label: string; value: number }[];
  store?: Growth;
  trendyol?: Growth | null;
};
export default function StudioCustomers({
  children,
  onChannelChange,
}: {
  children: React.ReactNode;
  onChannelChange?: (channel:string)=>void;
}) {
  const [channel,setChannel]=useState('all');
  const [period, setPeriod] = useState("28d"),
    [data, setData] = useState<Growth | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/admin/customers/summary?period=" + period, {
      cache: "no-store",
      signal: c.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error || "Müşteri özeti alınamadı.");
        if (!c.signal.aborted) setData(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [period]);
  const store=data?.store||data;
  const selected=channel==='trendyol'?data?.trendyol:store;
  return (
    <div className={s.page}>
      <header className={s.header}>
        <div>
          <h1>Müşteriler</h1>
          <p>Müşteri kazanımı, mesajlar ve ürün geri bildirimleri.</p>
        </div>
        <label className={s.date}>
          Dönem
          <select
            value={period}
            onChange={(e) => {
              setData(null);
              setError("");
              setPeriod(e.target.value);
            }}
          >
            {[
              ["48h", "48 saat"],
              ["7d", "7 gün"],
              ["28d", "28 gün"],
              ["90d", "90 gün"],
              ["365d", "1 yıl"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className={s.switch} role="group" aria-label="Müşteri kanalı">
        {[['all','Tümü'],['store','Mağaza'],['trendyol','Trendyol']].map(([key,label])=><button key={key} aria-pressed={channel===key} onClick={()=>{setChannel(key);onChannelChange?.(key);}}>{label}</button>)}
      </div>
      <p className={s.note}>Kanallar arasında aynı kişi eşleştirilmez. Tümü görünümünde kanal sayıları ayrı gösterilir; toplanıp tekil müşteri sayısı olarak sunulmaz.</p>
      {channel==='all'&&<section className={s.panel}><h2>Kanallara göre alıcılar</h2><p>Mağaza: {store?.total??'Veri yok'} · Trendyol: {data?.trendyol?.total??'Henüz hazırlanmadı'}</p><p className={s.note}>Trendyol sayımı yalnız takma kimlikle kaydedilen arşiv geçmişini kapsar. Eski siparişlerin aktarımı tamamlanmadan tüm zamanların müşteri sayısı değildir.</p></section>}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <div className={s.customerMetrics}>
        {[
          [channel==='trendyol'?"Arşivde gözlenen alıcı":"Mağaza müşterisi", selected?.total],
          [channel==='trendyol'?"Bu dönemde ilk gözlenen alıcı":"Yeni mağaza müşterisi", selected?.newCustomers],
        ].map(([label, value]) => (
          <div className={s.metric} key={label}>
            <span className={s.metricTop}>{label}</span>
            <strong>
              {value === undefined
                ? (channel==='trendyol'?"Henüz hazırlanmadı":"Veri yok")
                : Number(value).toLocaleString("tr-TR")}
            </strong>
            <small>{channel==='trendyol'?'Trendyol kanalındaki arşiv kapsamı':'En az bir doğrulanmış mağaza ödemesi olan alıcı'}</small>
          </div>
        ))}
      </div>
      <section className={s.panel}>
        <h2>{channel==='trendyol'?'Arşivde ilk gözlenen alıcılar':'Mağaza müşteri kazanımı'}</h2>
        {selected?.series.length ? (
          <StudioChart rows={selected.series} unit={channel==='trendyol'?'İlk gözlenen alıcı':'Yeni müşteri'} />
        ) : (
          <p className={s.empty}>
            {error
              ? "Rapor şu anda kullanılamıyor."
              : channel==='trendyol'&&!selected ? 'Trendyol alıcı geçmişi henüz hazırlanmadı; sipariş sayısı müşteri sayısı yerine kullanılmaz.' : selected
                ? "Bu dönemde yeni müşteri kaydı yok."
                : "Rapor yükleniyor…"}
          </p>
        )}
        <details className={s.note}>
          <summary>Müşteriler nasıl sayılıyor?</summary>
          <p>
            Mağaza kapsamı. Üyeler hesap ID, misafirler normalize e-posta ile
            sayılır; farklı kimlikle alışveriş yapan aynı kişi kesin
            eşleştirilemez. Trendyol ayrı takma kimlikle sayılır; ad veya adres üzerinden kanal eşleştirmesi yapılmaz.
          </p>
        </details>
      </section>
      <section className={s.recent}>
        <h2>Müşteri iletişimi</h2>
        <p className={s.note}>
          {channel==='trendyol'?'Trendyol mesaj, soru ve yorum bağlantısı henüz bağlı değil. Mağaza içerikleri burada Trendyol içeriği gibi gösterilmez.':'Kaynak: Mağaza. Mesajları, ürün sorunlarını ve yorumları aşağıdan yönetin. Trendyol iletişim bağlantısı henüz bağlı değil.'}
        </p>
        {channel!=='trendyol'&&children}
      </section>
    </div>
  );
}
