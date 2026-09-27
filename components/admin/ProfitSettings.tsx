'use client';
import { useEffect, useRef, useState } from 'react';
import { calculateProfit, validateProfitSettings, type ProfitPlatform, type ProfitProfile, type ProfitSettings } from '@/lib/finance/profit';
import { parseTryAmount } from '@/lib/finance/contribution';
import type { ManualMetaEntry } from '@/lib/finance/manual-meta';
import ManualMetaAds from './ManualMetaAds';
import s from './ProfitAnalysis.module.css';

const fields: {key:keyof ProfitSettings;label:string;group:'rate'|'fixed'}[]=[
  {key:'vatBps',label:'Satış KDV oranı (%)',group:'rate'},
  {key:'commissionBps',label:'Komisyon / ödeme kesintisi (%)',group:'rate'},
  {key:'hiddenBps',label:'Diğer gider payı (%)',group:'rate'},
  {key:'advertisingBps',label:'Reklam gider payı (%)',group:'rate'},
  {key:'shippingMinor',label:'Kargo gideri (TL)',group:'fixed'},
  {key:'packagingMinor',label:'Paketleme / kutu gideri (TL)',group:'fixed'},
  {key:'logisticsMinor',label:'Lojistik / depo gideri (TL)',group:'fixed'},
  {key:'giftThresholdMinor',label:'Hediye eşiği, indirim sonrası tutar (TL)',group:'fixed'},
  {key:'giftCostMinor',label:'Eşik üzeri hediye gideri (TL)',group:'fixed'},
];
const empty=()=>Object.fromEntries(fields.map(f=>[f.key,''])) as Record<keyof ProfitSettings,string>;
const money=(minor:number|null)=>minor===null?'Hesaplanamadı':(minor/100).toLocaleString('tr-TR',{style:'currency',currency:'TRY'});
type Pending={signature:string;body:{requestId:string;platform:ProfitPlatform;settings:ProfitSettings;expectedVersion:number;effectiveFrom:string}};
export default function ProfitSettings({active}:{active:boolean}) {
  const [profiles,setProfiles]=useState<ProfitProfile[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  const [metaEntries,setMetaEntries]=useState<ManualMetaEntry[]|null>(null),[metaError,setMetaError]=useState('');
  const [platform,setPlatform]=useState<ProfitPlatform>('store'),[form,setForm]=useState(empty),[effectiveDate,setEffectiveDate]=useState('');
  const [price,setPrice]=useState(''),[discount,setDiscount]=useState(''),[goods,setGoods]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[messageError,setMessageError]=useState(false);
  const pending=useRef<Pending|null>(null);
  useEffect(()=>{if(!active)return;const controller=new AbortController();
    async function load(){try{const [r,m]=await Promise.all([fetch('/api/admin/finance/profit-settings',{cache:'no-store',signal:controller.signal}),fetch('/api/admin/finance/manual-meta',{cache:'no-store',signal:controller.signal})]);const [data,meta]=await Promise.all([r.json(),m.json()]);if(controller.signal.aborted)return;if(!r.ok)throw new Error(data.error||'Ayarlar alınamadı.');setProfiles(data.profiles);setLoaded(true);setError('');setMetaEntries(m.ok?meta.entries:null);setMetaError(m.ok?'':meta.error||'Reklam kayıtları alınamadı.');}catch(e){if(!controller.signal.aborted){setLoaded(false);setError(e instanceof Error?e.message:'Ayarlar alınamadı.');}}}
    void load();return()=>controller.abort();},[active,revision]);
  const current=profiles.filter(p=>p.platform===platform).sort((a,b)=>b.version-a.version)[0];
  function parsed(){
    const settings=Object.fromEntries(fields.map(({key,label})=>{let n:number|null;try{n=parseTryAmount(form[key]);}catch{throw new Error(`${label}: geçerli bir sayı girin; binlik ayırıcı kullanmayın.`);}if(n===null)throw new Error(`${label}: boş bırakmayın; gider yoksa 0 girin.`);return [key,n];}));
    try{return validateProfitSettings(settings);}catch{throw new Error('Yüzdeler 0–100 arasında olmalı; hediye gideri varsa hediye eşiği 0 olamaz.');}
  }
  let preview:ReturnType<typeof calculateProfit>|null=null;
  try {const sale=parseTryAmount(price),coupon=parseTryAmount(discount),cost=parseTryAmount(goods);if(sale!==null&&coupon!==null&&cost!==null&&coupon<=sale)preview=calculateProfit(sale-coupon,cost,parsed());}catch{ /* Draft is incomplete. */ }
  function choose(p:ProfitPlatform){setPlatform(p);setForm(empty());setEffectiveDate('');setMessage('');pending.current=null;}
  function loadCurrent(){if(!current)return;setForm(Object.fromEntries(fields.map(({key})=>[key,Number.isSafeInteger(current.settings?.[key])?String(current.settings[key]/100):''])) as Record<keyof ProfitSettings,string>);pending.current=null;}
  async function save(){setMessage('');setMessageError(false);try{
    if(!loaded||!effectiveDate)throw new Error('Önce başlangıç tarihini seçin.');
    const settings=parsed(),effectiveFrom=new Date(`${effectiveDate}T00:00:00+03:00`).toISOString();
    if(Date.parse(effectiveFrom)>Date.now())throw new Error('Gelecek tarih seçilemez.');
    const expectedVersion=current?.version||0,signature=JSON.stringify({platform,settings,effectiveFrom,expectedVersion});
    if(pending.current?.signature!==signature)pending.current={signature,body:{requestId:crypto.randomUUID(),platform,settings,effectiveFrom,expectedVersion}};
    setBusy(true);const r=await fetch('/api/admin/finance/profit-settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(pending.current.body)});
    const data=await r.json();if(!r.ok){if(r.status===409)setLoaded(false);throw new Error(data.error||'Ayar kaydedilemedi.');}
    pending.current=null;setMessage(`Sürüm ${data.version} kaydedildi. ${effectiveDate} tarihinden sonraki satışların tahmini yeniden hesaplanır.`);setRevision(v=>v+1);
  }catch(e){setMessageError(true);setMessage(e instanceof Error?e.message:'Ayar kaydedilemedi.');}finally{setBusy(false);}}
  return <section className={s.root} aria-label="Kâr ayarları">
    <div className={s.heading}><div><h2>Kâr ayarları</h2><p>Mağaza ve Trendyol için ayrı giderler ve geçerlilik tarihi.</p></div></div>
    <div className={s.tabs}>{(['store','trendyol'] as const).map(p=><button type="button" key={p} aria-pressed={platform===p} disabled={busy} onClick={()=>choose(p)}>{p==='store'?'Mağaza':'Trendyol'}</button>)}</div>
    {error&&<p role="alert" className={s.warning}>{error}</p>}
    {metaError&&<p role="alert" className={s.warning}>{metaError}</p>}
    <div className={s.setup}><strong>Her sürüm tarihlidir</strong><p>Yeni sürüm, seçtiğiniz günün Türkiye saatiyle 00.00’ından itibaren yapılan siparişlerin tahminini değiştirir. Daha eski siparişlere eski ayar uygulanır; siparişin kendisi değişmez. Geriye dönük tarih seçerseniz geçmiş raporlar da yeniden hesaplanır.</p></div>
    <section className={s.panel}><h3>{platform==='store'?'Mağaza':'Trendyol'} giderleri</h3>
      <p>{current?`Son kayıt: sürüm ${current.version} · ${new Date(current.effective_from).toLocaleString('tr-TR')}`:'Bu kanal için henüz ayar kaydı yok.'}</p>
      {current&&<button type="button" disabled={busy} onClick={loadCurrent}>Kayıtlı ayarları forma getir</button>}
      <h3>Yüzdelik giderler</h3><div className={s.form}>{fields.filter(f=>f.group==='rate').map(({key,label})=><label key={key}>{label}<input disabled={busy} inputMode="decimal" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder="Yoksa 0" /></label>)}</div>
      <h3>Sabit giderler</h3><div className={s.form}>{fields.filter(f=>f.group==='fixed').map(({key,label})=><label key={key}>{label}<input disabled={busy} inputMode="decimal" value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder="Yoksa 0" /></label>)}</div>
      <p className={s.note}>Ürün maliyeti ürün kaydından gelir; burada tekrar girilmez. Hediye uygulanmıyorsa eşik ve gider için 0 girin. Kargo mağazada sipariş, Trendyol’da paket başınadır. Meta harcamasını elle ayrıca girecekseniz aynı gideri reklam yüzdesiyle ikinci kez düşmeyin.</p>
      <label className={s.date}>Yeni sürümün geçerli olacağı gün<input type="date" required disabled={busy} value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)} /></label>
      <button type="button" className={s.primary} disabled={busy||!loaded} onClick={save}>{busy?'Kaydediliyor…':'Yeni ayar sürümünü kaydet'}</button>
      {message&&<p role={messageError?'alert':'status'} className={messageError?s.warning:undefined}>{message}</p>}
    </section>
    <ManualMetaAds entries={metaEntries} period={null} channel="all" available={metaEntries!==null} onSaved={()=>setRevision(v=>v+1)} />
    <details className={s.panel}><summary>Satış öncesi hesaplama denemesi</summary>
      <div className={s.form}>{[['KDV dahil satış fiyatı (TL)',price,setPrice],['Satıcının karşıladığı kupon (TL)',discount,setDiscount],['KDV dahil toplam ürün maliyeti (TL)',goods,setGoods]].map(([label,value,set])=><label key={String(label)}>{String(label)}<input inputMode="decimal" value={String(value)} onChange={e=>(set as (s:string)=>void)(e.target.value)} /></label>)}</div>
      <p aria-live="polite"><b>Tahmini kalan: {preview?money(preview.profitMinor):'Tüm giderleri ve deneme tutarlarını doldurun'}</b></p>
      {preview&&<p className={s.note}>KDV {money(preview.deductions.vat)} · Komisyon {money(preview.deductions.commission)} · Kargo {money(preview.deductions.shipping)} · Paketleme {money(preview.deductions.packaging)} · Lojistik {money(preview.deductions.logistics)} · Hediye {money(preview.deductions.gift)} · Diğer {money(preview.deductions.hidden)} · Reklam {money(preview.deductions.advertising)}</p>}
      <p className={s.note}>Deneme kayıt oluşturmaz. ZIP’teki örnek rakamlar forma otomatik yerleştirilmez; KDV dahil satışta iç yüzde kullanılır.</p>
    </details>
    <details className={s.panel}><summary>Ayar geçmişi ({profiles.filter(p=>p.platform===platform).length})</summary><div className={s.rows}>{profiles.filter(p=>p.platform===platform).sort((a,b)=>b.version-a.version).map(p=><article key={`${p.platform}:${p.version}`}><b>Sürüm {p.version}</b><small>{new Date(p.effective_from).toLocaleString('tr-TR')} tarihinden itibaren · {(() => {try{validateProfitSettings(p.settings);return '9 gider alanı tamam';}catch{return 'Eski ayar: yeni gider alanları eksik';}})()}</small></article>)}</div></details>
  </section>;
}
