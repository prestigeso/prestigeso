'use client';
import { useRef, useState } from 'react';
import { manualMetaSpend, matchingManualMetaEntries, type ManualMetaChannel, type ManualMetaEntry } from '@/lib/finance/manual-meta';
import s from './ProfitAnalysis.module.css';

const money=(minor:number)=>(minor/100).toLocaleString('tr-TR',{style:'currency',currency:'TRY'});
export default function ManualMetaAds({entries,onSaved,period,channel,available}:{entries:ManualMetaEntry[]|null;onSaved:()=>void;period:{since:number;until:number}|null;channel:ManualMetaChannel;available:boolean}) {
  const [key,setKey]=useState(''),[version,setVersion]=useState(0),[startDate,setStartDate]=useState(''),[endDate,setEndDate]=useState(''),[amount,setAmount]=useState(''),[target,setTarget]=useState<ManualMetaChannel>('all'),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const pending=useRef<{signature:string;requestId:string;key:string}|null>(null);
  function reset() { setKey('');setVersion(0);setStartDate('');setEndDate('');setAmount('');setTarget('all');setNote('');pending.current=null;setMessage(''); }
  function edit(entry:ManualMetaEntry) {setKey(entry.key);setVersion(entry.version);setStartDate(entry.startDate);setEndDate(entry.endDate);setAmount((entry.amountMinor/100).toFixed(2));setTarget(entry.channel);setNote(entry.note);pending.current=null;setMessage('');}
  async function save() {
    setMessage('');
    const signature=JSON.stringify({key,version,startDate,endDate,amount,target,note});
    if (pending.current?.signature!==signature) pending.current={signature,requestId:crypto.randomUUID(),key:key||`${startDate}:meta-${crypto.randomUUID()}`};
    setBusy(true);
    try {
      const r=await fetch('/api/admin/finance/manual-meta',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:pending.current.requestId,key:pending.current.key,expectedVersion:version,startDate,endDate,amount,channel:target,note})});
      const data=await r.json();if (!r.ok) throw new Error(data.error||'Kaydetme doğrulanamadı.');
      pending.current=null;reset();setMessage('Meta reklam harcaması kaydedildi. Dönem toplamı yenileniyor.');onSaved();
    } catch(e) {setMessage(e instanceof Error?e.message:'Kaydetme doğrulanamadı. Aynı alanlarla tekrar deneyin.');}
    finally {setBusy(false);}
  }
  const matched=entries&&period?matchingManualMetaEntries(entries,period.since,period.until,channel):null;
  const spend=matched?.length&&period?manualMetaSpend(matched,period.since,period.until,channel):null;
  return <details className={s.panel}><summary>Meta reklam harcaması · elle giriş</summary>
    <p className={s.note}>API bağlantısı gerekmez. Girilen toplam tutar tarih aralığına günlere eşit dağıtılır; seçili raporla kesişen pay gösterilir. Bu, Meta kaynaklı satış veya ROAS ölçümü değildir.</p>
    {period&&<div className={s.metaSummary}><span>Seçili döneme düşen kayıtlı harcama</span><strong>{spend===null?'Bu dönemde kayıt yok':money(spend)}</strong><small>{channel==='all'?'Tüm kayıtlar':channel==='store'?'Yalnız mağazaya atanan':'Yalnız Trendyol’a atanan'} · ortak giderler yalnız Tümü görünümünde. Kayıt yoksa gider sıfır varsayılmaz.</small></div>}
    <div className={s.form}>
      <label>Başlangıç günü<input type="date" disabled={busy||!available||Boolean(key)} value={startDate} onChange={e=>setStartDate(e.target.value)} /></label>
      <label>Bitiş günü (dahil)<input type="date" disabled={busy||!available} value={endDate} onChange={e=>setEndDate(e.target.value)} /></label>
      <label>Toplam harcama (TL)<input inputMode="decimal" disabled={busy||!available} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Örn. 1500,00" /></label>
      <label>Giderin ait olduğu kanal<select disabled={busy||!available} value={target} onChange={e=>setTarget(e.target.value as ManualMetaChannel)}><option value="all">Genel / dağıtılmamış</option><option value="store">Mağaza</option><option value="trendyol">Trendyol</option></select></label>
      <label className={s.metaNote}>Kısa açıklama (kişisel veri yazmayın)<input disabled={busy||!available} value={note} maxLength={500} onChange={e=>setNote(e.target.value)} placeholder="Örn. Eylül Meta kampanyası" /></label>
    </div>
    <div className={s.tabs}><button type="button" className={s.primary} disabled={busy||!available||!startDate||!endDate||!amount||note.trim().length<3} onClick={save}>{busy?'Kaydediliyor…':version?'Düzeltmeyi kaydet':'Harcama ekle'}</button>{version>0&&<button type="button" disabled={busy} onClick={reset}>Yeni kayıt</button>}</div>
    <p className={s.note}>Düzeltme önceki sürümü silmez. Sıfır tutar yalnız gerçek gider sıfırlandıysa girilir. Reklam gider payı (%) da tanımlıysa aynı harcamayı iki kez düşmemek için düzeltilmiş toplam gösterilmez.</p>
    {message&&<p role="status">{message}</p>}
    <div className={s.metaEntries}><h3>Kayıtlar ({entries?.length??'—'})</h3>{entries?.slice().sort((a,b)=>b.startDate.localeCompare(a.startDate)).slice(0,30).map(e=><article key={e.key}><div><b>{e.startDate} – {e.endDate} · {money(e.amountMinor)}</b><small>{e.channel==='all'?'Genel':e.channel==='store'?'Mağaza':'Trendyol'} · sürüm {e.version} · {e.note}</small></div><button type="button" disabled={busy} onClick={()=>edit(e)}>Düzelt</button></article>)}{entries&&entries.length>30&&<p className={s.note}>İlk 30 kayıt gösteriliyor; rapor tüm kayıtları kapsar.</p>}</div>
  </details>;
}
