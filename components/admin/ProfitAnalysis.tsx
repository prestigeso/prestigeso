'use client';
import { useEffect, useState } from 'react';
import { validateProfitSettings, type ProfitProfile } from '@/lib/finance/profit';
import type { buildProfitReport } from '@/lib/finance/profit-report';
import { optionalManualMetaSpend, matchingManualMetaEntries, type ManualMetaChannel, type ManualMetaEntry } from '@/lib/finance/manual-meta';
import s from './ProfitAnalysis.module.css';

const money = (n: number | null) => n === null ? 'Hesaplanamadı' : (n / 100).toLocaleString('tr-TR', { style:'currency',currency:'TRY' });
type Report = ReturnType<typeof buildProfitReport> & { returns: { count:number; debtMinor:number; shippingEstimateMinor:number|null; covered:boolean; salesCovered:boolean; archiveCovered:boolean }; period:{since:number;until:number} };
export default function ProfitAnalysis({ active, syncRevision = 0, onOpenSettings }: { active: boolean; syncRevision?: number; onOpenSettings?:()=>void }) {
  const [profiles,setProfiles] = useState<ProfitProfile[]>([]), [report,setReport] = useState<Report|null>(null);
  const [metaEntries,setMetaEntries] = useState<ManualMetaEntry[]|null>(null),[metaError,setMetaError]=useState('');
  const [days,setDays] = useState('28'), [channel,setChannel] = useState('all'), [revision,setRevision] = useState(0);
  const [error,setError] = useState(''), [loaded,setLoaded] = useState(false);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    async function load() {
      try {
        const [a,b,c] = await Promise.all([fetch('/api/admin/finance/profit-settings', { cache:'no-store',signal:controller.signal }),fetch(`/api/admin/finance/profit?days=${days}`,{ cache:'no-store',signal:controller.signal }),fetch('/api/admin/finance/manual-meta',{cache:'no-store',signal:controller.signal})]);
        const [x,y,z] = await Promise.all([a.json(),b.json(),c.json()]);
        if (controller.signal.aborted) return;
        if (!a.ok || !b.ok) throw new Error(x.error || y.error || 'Kâr raporu alınamadı.');
        setProfiles(x.profiles); setReport(y); setError(''); setLoaded(true);
        setMetaEntries(c.ok?z.entries:null);setMetaError(c.ok?'':z.error||'Meta harcama kayıtları okunamadı; düzeltilmiş toplam gösterilmiyor.');
      } catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : 'Rapor alınamadı.');setReport(null);setLoaded(false); } }
    }
    void load(); return () => controller.abort();
  },[active,days,revision,syncRevision]);
  const rows = (report?.rows || []).filter(r => channel === 'all' || r.platform === channel);
  const included = rows.filter(r => r.result), excluded = rows.length-included.length;
  const total = included.length ? included.reduce((sum,r)=>sum+r.result!.profitMinor!,0) : null;
  const matchedMeta = metaEntries && report ? matchingManualMetaEntries(metaEntries,report.period.since,report.period.until,channel as ManualMetaChannel) : null;
  const metaSpend = report ? optionalManualMetaSpend(matchedMeta,report.period.since,report.period.until,channel as ManualMetaChannel) : null;
  const rateAdvertising = rows.some(r=>r.result && r.result.deductions.advertising>0);
  const adjusted = total !== null && metaSpend !== null && excluded===0 && !rateAdvertising && (channel==='store'||report?.returns.salesCovered) ? total-metaSpend : null;
  const missingSettings = (['store','trendyol'] as const).filter(p => !profiles.some(row => {if(row.platform!==p)return false;try{validateProfitSettings(row.settings);return true;}catch{return false;}}));
  return <section className={s.root} aria-label="Kâr analizi">
    <div className={s.heading}><div><h2>Tahmini net kâr</h2><p>Satıştan geriye ne kalıyor?</p></div><label>Dönem<select value={days} onChange={e=>{setDays(e.target.value);setReport(null);}}>{[['1','24 saat'],['2','48 saat'],['7','7 gün'],['28','28 gün'],['90','90 gün'],['365','365 gün']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
    <div className={s.tabs}>{[['all','Tümü'],['store','Mağaza'],['trendyol','Trendyol']].map(([v,l])=><button key={v} aria-pressed={channel===v} onClick={()=>setChannel(v)}>{l}</button>)}<button onClick={()=>{setReport(null);setRevision(v=>v+1);}}>Yenile</button></div>
    {error && <p role="alert" className={s.warning}>{error}</p>}
    {metaError && <p role="alert" className={s.warning}>{metaError}</p>}
    {loaded && missingSettings.length > 0 && <div role="status" className={s.setup}><strong>Kâr ayarları tamamlanmadı</strong><p>{missingSettings.map(p=>p==='store'?'Mağaza':'Trendyol').join(' ve ')} için doğrulanmış KDV ve gider değerleri henüz kaydedilmedi. Değerler netleşene kadar boş alanlar sıfır kabul edilmez; bu platformların kârı hesaplanmaz.</p>{onOpenSettings&&<button type="button" onClick={onOpenSettings}>Kâr ayarlarına git</button>}</div>}
    {report && !report.returns.archiveCovered && <div className={s.setup}><strong>Trendyol geçmişi bu dönemi tam kapsamıyor</strong><p>Özellikle uzun dönemlerde eski siparişleri sıfır satış kabul etmiyoruz. Eksik geçmiş tamamlanana kadar Trendyol paketleri tahmini kâr toplamına alınmaz.</p></div>}
    <div className={s.cards}><article><span>Tahmini kalan tutar</span><strong>{report ? money(total) : 'Veri yok'}</strong><small>Yalnız hesaplanabilen kayıtlar</small></article><article><span>Hesaplanan kayıt</span><strong>{report ? included.length : '—'}</strong><small>Mağaza siparişi / Trendyol paketi</small></article><article><span>İncelenecek kayıt</span><strong>{report ? excluded : '—'}</strong><small>Maliyet, ayar, iade veya indirim kontrolü</small></article></div>
    {metaSpend !== null && metaSpend > 0 && <div className={s.metaSummary}><span>Kayıtlı Meta harcaması sonrası tahmini kalan</span><strong>{adjusted===null?'Hesaplanamadı':money(adjusted)}</strong><small>Seçili döneme düşen kayıtlı reklam gideri {money(metaSpend)} · {adjusted===null?'Eksik satış maliyeti, iade/arşiv kapsamı veya yüzde bazlı reklam gideri kontrol edilmeli':'Yalnız tam hesaplanan satışlardan düşüldü.'}</small>{onOpenSettings&&<button type="button" onClick={onOpenSettings}>Reklam harcamasını ayarlardan gir</button>}</div>}
    {report && <p className={s.note}>{`${report.returns.covered ? 'Seçili dönemde' : 'Eksik arşivde şu ana kadar'} Trendyol cari hesapta ${report.returns.count} iade satırı görüldü; kayıtlı borç−alacak toplamı ${money(report.returns.debtMinor)}. İade edilen siparişler için ayardaki paket başı kargoyla tahmini toplam ${money(report.returns.shippingEstimateMinor)}. Bu iki tutar gerçek net zarar değildir ve hesaplanan satış kârından ayrıca düşülmez.`} {!report.returns.covered && (report.returns.salesCovered ? 'Dönemsel iade toplamı henüz kesin değil; yalnız iade kontrolü yapılmış satışlar hesaplanır.' : 'İade arşivi seçili satışlar için tam ve güncel değil; Trendyol paketleri kâr toplamına alınmaz.')}</p>}
    {rows.some(r=>r.result && r.currentCostEstimate) && <p className={s.note}>Bazı eski Trendyol satışlarında satış gününe ait ürün maliyeti kaydı yok. Bu satırlarda bugün kayıtlı ürün maliyeti geriye dönük tahmin olarak kullanıldı; tarihsel maliyet olarak doğrulanmış değildir.</p>}
    <p className={s.note}>Bu bir gider tahminidir; muhasebesel net kâr veya Trendyol hakedişi değildir. Satış KDV’si ayrılır, giderler KDV dahil düşülür; indirilecek alış KDV’si hesaba katılmaz. Komisyon ve reklam oranları indirim sonrası satış tutarına uygulanır. Trendyol kargo gideri paket başınadır.</p>
    <details className={s.panel}><summary>Sipariş bazında döküm ({rows.length})</summary><div className={s.rows}>{rows.slice(0,100).map(r=><article key={`${r.platform}:${r.id}`}><div><b>{r.platform==='store'?'Mağaza':'Trendyol'} · {r.id}</b><small>{new Date(r.at).toLocaleDateString('tr-TR')} · Ayar sürümü {r.profileVersion ?? 'yok'}{r.currentCostEstimate && r.result ? ' · Güncel maliyetle geriye dönük tahmin' : ''}</small></div><strong>{r.result ? money(r.result.profitMinor) : r.reason}</strong>{r.result && <small>Satış {money(r.result.saleMinor)} · KDV {money(r.result.deductions.vat)} · Ürün {money(r.result.deductions.goods)} · Komisyon {money(r.result.deductions.commission)} · Kargo {money(r.result.deductions.shipping)} · Paket {money(r.result.deductions.packaging)} · Diğer {money(r.result.deductions.hidden)} · Reklam {money(r.result.deductions.advertising)}</small>}</article>)}</div>{rows.length>100 && <p>İlk 100 kayıt gösteriliyor. Toplam, dönemin tüm kayıtlarını kapsar.</p>}{report && !rows.length && <p>Seçili dönemde kayıt yok.</p>}</details>
  </section>;
}
