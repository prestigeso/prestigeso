"use client";
import Link from "next/link";
import { useState } from "react";
import styles from './WorkspaceDesign.module.css';
import AdminSectionNav from './AdminSectionNav';
import TrendyolPackages from "@/components/admin/TrendyolPackages";
import Phase2Records from "@/components/admin/Phase2Records";
import SearchConsoleReport from "@/components/admin/SearchConsoleReport";
import OrderContribution from "@/components/admin/OrderContribution";
import PriceScenario from "@/components/admin/PriceScenario";
import TrendyolSync from "@/components/admin/TrendyolSync";
import SearchInspection from "@/components/admin/SearchInspection";
import MarketingPreparationStatus from "@/components/admin/MarketingPreparationStatus";
import { calculateContribution, FINANCE_FIELDS, parseTryAmount, type FinanceField, type ContributionInput } from "@/lib/finance/contribution";

const labels: Record<FinanceField, string> = {
  revenue: "Sipariş toplamı (indirim sonrası, müşteriden alınan kargo dahil)",
  refunds: "Bu siparişlere ait iadeler", goods: "Satılan ürünlerin net maliyeti",
  paymentFees: "Ödeme komisyonu ve kesintiler", packaging: "Paketleme gideri",
  shipping: "Mağazanın ödediği kargo gideri", returnCosts: "Ek iade gideri", advertising: "Aynı kapsamdaki reklam harcaması",
};
const format = (minor: number | null) => minor === null ? "Eksik veri" : (minor / 100).toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
const areas = [
  { id: 'overview', name: 'Genel bakış', icon: '◫', description: 'Mağazanızın finans ve bağlantı merkezi.' },
  { id: 'finance', name: 'Finans', icon: '₺', description: 'Maliyetleri yönetin, sipariş katkısını inceleyin.' },
  { id: 'trendyol', name: 'Trendyol', icon: '↗︎', description: 'Paketleri ve aktarım işlerini tek yerde takip edin.' },
  { id: 'google', name: 'Google', icon: '⌕', description: 'Arama performansını ve indeks kayıtlarını inceleyin.' },
  { id: 'meta', name: 'Meta', icon: '◎', description: 'Pazarlama izni ve olay hazırlığını kontrol edin.' },
] as const;
type Area = typeof areas[number]['id'];
const financeViews = [{id:'records',name:'Maliyet kayıtları'},{id:'orders',name:'Sipariş katkısı'},{id:'price',name:'Fiyat planlama'},{id:'scenario',name:'Katkı senaryosu'}] as const;
export default function Phase2Workspace() {
  const [area, setArea] = useState<Area>('overview');
  const [financeView, setFinanceView] = useState<string>('records');
  const current = areas.find(item => item.id === area)!;
  const [values, setValues] = useState<Record<FinanceField, string>>({ revenue: "", refunds: "", goods: "", paymentFees: "", packaging: "", shipping: "", returnCosts: "", advertising: "" });
  const [confirmed, setConfirmed] = useState(false);
  const parsed: ContributionInput = { revenue: null, refunds: null, goods: null, paymentFees: null, packaging: null, shipping: null, returnCosts: null, advertising: null };
  const errors: Partial<Record<FinanceField, string>> = {};
  for (const field of FINANCE_FIELDS) { try { parsed[field] = parseTryAmount(values[field]); } catch { errors[field] = "0 veya pozitif tutar yazın; en çok iki ondalık basamak, binlik ayırıcı yok. Üst sınır 1 milyar TL."; } }
  let result: ReturnType<typeof calculateContribution> | null = null, calculationError = "";
  if (!Object.keys(errors).length && confirmed) {
    try { result = calculateContribution(parsed); } catch { calculationError = "Bu sipariş grubunun iadesi, grubun sipariş toplamından büyük olamaz. Dönem/nakit akışı ile sipariş grubu hesabını karıştırmayın."; }
  }
  return <><AdminSectionNav current="phase2" /><div className={styles.workspace}><aside className={styles.sidebar}>
    <Link href="/admin" className={styles.brand}>PRESTIGE<span>SO</span><small>YÖNETİM MERKEZİ</small></Link>
    <p className={styles.navLabel}>ÇALIŞMA ALANI</p>
    <nav aria-label="Çalışma alanı bölümleri">{areas.map(item => <button key={item.id} aria-current={area===item.id?'page':undefined} onClick={()=>setArea(item.id)}><span aria-hidden="true">{item.icon}</span>{item.name}{area===item.id&&<i aria-hidden="true"/>}</button>)}</nav>
    <div className={styles.sidebarFooter}><Link href="/admin/analytics">← Mağaza yolculuğu analizi</Link><p>PRESTIGESO / OPERASYON</p></div>
  </aside><div className={styles.main}>
    <div className={styles.topbar}><span>Yönetim <b>/</b> Çalışma alanı</span><Link href="/admin">Ana panele dön ↗︎</Link></div>
    <header className={styles.pageHeader}><div><p className={styles.eyebrow}>FİNANS & ENTEGRASYONLAR</p><h1>{current.name}</h1><p>{current.description}</p></div><span className={styles.workspaceBadge}>Mağaza operasyonları</span></header>
    <div hidden={area!=='overview'} className={styles.overview}>
      <section className={styles.hero}><div><span className={styles.heroTag}>DAHA NET BİR BAKIŞ</span><h2>Her kararın<br/>arkasında doğru veri.</h2><p>Maliyetler, satış kanalları ve arama performansı. İhtiyacınız olan araçlara tek bir çalışma alanından ulaşın.</p><button onClick={()=>setArea('finance')}>Finans alanını aç <span aria-hidden="true">↗︎</span></button></div><div className={styles.heroArt} aria-hidden="true"><div/><div/><div/><span>PS / 02</span></div></section>
      <div className={styles.sectionHeading}><h2>Çalışma alanlarınız</h2><span>Bir alan seçerek başlayın</span></div>
      <div className={styles.cards}>{areas.filter(item=>item.id!=='overview').map(item=><button className={styles.areaCard} key={item.id} onClick={()=>setArea(item.id)}><span className={styles.cardIcon} aria-hidden="true">{item.icon}</span><span className={styles.cardTitle}>{item.name}<span aria-hidden="true">↗︎</span></span><span className={styles.cardDescription}>{item.description}</span><span className={styles.cardFoot}>{item.id==='finance'?'Maliyet · Katkı · Planlama':item.id==='google'?'Raporlar · İndeks denetimi':item.id==='trendyol'?'Paketler · Aktarım · Eşleme':'İzinler · Olay hazırlığı'}</span></button>)}</div>
      <div className={styles.overviewNote}><span aria-hidden="true">i</span><div><strong>Bağlantı durumu, verinin kendisinden doğrulanır.</strong><p>Bu ekran canlı satış özeti değildir. Google erişimini ilgili bölümden kontrol edin. Trendyol aktarımı yapılandırma gerektirir; Meta olay gönderimi henüz kapalıdır.</p></div></div>
    </div>
    <div hidden={area!=='trendyol'} className={styles.content}><TrendyolPackages /><TrendyolSync /><div className={styles.inlineNote}>Trendyol SKU eşlemelerini bu bölümde, ürün maliyetlerini Finans → Maliyet kayıtları bölümünde yönetin. Paket aktarımı site stoğunu değiştirmez.</div></div>
    <div hidden={area!=='google'} className={styles.content}><SearchConsoleReport /><SearchInspection /></div>
    <div hidden={area!=='meta'} className={styles.content}><section aria-label="Entegrasyon durumu"><span className={styles.pendingBadge}>HAZIRLIK AŞAMASINDA</span><h2>Meta reklam & Pixel/CAPI</h2><p>Hesap, izin ve atıf sözleşmesi doğrulanmadı. Meta’ya olay gönderilmez; Meta ROAS gösterilmez. Manuel reklam gideri Finans bölümünden kaydedilebilir.</p></section><MarketingPreparationStatus /></div>
    <div hidden={area!=='finance'}>
      <nav className={styles.subnav} aria-label="Finans araçları">{financeViews.map(item=><button key={item.id} aria-current={financeView===item.id?'page':undefined} onClick={()=>setFinanceView(item.id)}>{item.name}</button>)}</nav>
      <div hidden={financeView!=='records'} className={styles.content}><Phase2Records /></div>
      <div hidden={financeView!=='orders'} className={styles.content}><OrderContribution /></div>
      <div hidden={financeView!=='price'} className={styles.content}><PriceScenario /></div>
      <div hidden={financeView!=='scenario'} className={styles.content}>
    <section className="bg-white border rounded-2xl p-5 space-y-4"><h2 className="text-xl font-bold">Katkı payı senaryosu — TRY</h2>
      <p className="text-sm">Aynı sipariş grubuna ait gerçekleşmiş tutarları girin. İndirim sipariş toplamına zaten dahilse tekrar düşmeyin. İade edilen ürünün geri kazanılan maliyetini net ürün maliyetinde hesaba katın. Kesinti/kargo tutarı iadelerden netleştirilmiş olmalı. Boş alan bilinmeyendir; gerçek sıfır için 0 yazın.</p>
      <div className="grid gap-4 md:grid-cols-2">{FINANCE_FIELDS.map((field) => <div key={field}><label htmlFor={`finance-${field}`} className="block text-sm font-medium">{labels[field]} (₺)</label><input id={`finance-${field}`} inputMode="decimal" autoComplete="off" maxLength={14} value={values[field]} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `error-${field}` : undefined} onChange={(event) => setValues((old) => ({ ...old, [field]: event.target.value }))} className="mt-1 w-full rounded-lg border p-3" placeholder="Bilinmiyor" />{errors[field] && <p id={`error-${field}`} className="text-red-700 text-sm mt-1">{errors[field]}</p>}</div>)}</div>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />Tutarların aynı sipariş kapsamına ait olduğunu ve vergi dahil/hariç esasını tutarlı kullandığımı doğruluyorum.</label>
      <p className="text-sm text-gray-600">Sayfa yalnız bellekte çalışır; veritabanına veya tarayıcı depolamasına kaydetmez. Yenilenince değerler silinir. Vergi, genel gider ve diğer giderler kapsamlı değildir; sonuç net kâr veya muhasebe raporu değildir.</p>
    </section>
    <section className="rounded-xl border bg-white p-5 space-y-3" aria-live="polite"><h2 className="font-bold">Hesap sonucu</h2>
      {!confirmed && <p>Kapsamı doğruladığınızda hesap gösterilir.</p>}{Object.keys(errors).length > 0 && <p role="alert">Hatalı tutarları düzeltin; sonuç hesaplanmadı.</p>}{calculationError && <p role="alert">{calculationError}</p>}
      {result && <><p>İade sonrası sipariş geliri: {format(result.netRevenue)}</p><p>Reklam öncesi katkı: {format(result.beforeAdvertising)}</p><p className="font-bold">Reklam sonrası katkı: {format(result.afterAdvertising)}</p><p>Katkı oranı: {result.marginPercent === null ? "Hesaplanamıyor" : `%${result.marginPercent.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`}</p><p>Toplam gelir / reklam harcaması: {result.blendedRevenueToSpend === null ? "Hesaplanamıyor" : result.blendedRevenueToSpend.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} — Meta ROAS değildir; reklamın ek satış yarattığını kanıtlamaz.</p>{result.missing.length > 0 && <p className="text-amber-800">Eksik alanlar: {result.missing.map((field) => labels[field]).join(", ")}. Eksikler sıfır sayılmadı.</p>}</>}
    </section>
      </div>
    </div>
    <footer className={styles.footer}>PRESTIGESO <span>Finans & entegrasyon çalışma alanı</span><span>Hesaplamalar net kâr veya muhasebe raporu değildir.</span></footer>
  </div></div></>;
}
