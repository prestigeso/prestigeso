'use client';
import { useMemo, useRef, useState } from 'react';
import type { projectStream } from '@/lib/trendyol/stream';
import { resolveSiteSku } from '@/lib/trendyol/product-match';
import { useVisibleRead } from './hooks/useVisibleRead';

type Package = ReturnType<typeof projectStream>['packages'][number];
type Product = { SKU:string; name:string; barcode:string|null };
type State = { jobs:{id:string;revision:number;status:string;updated_at:string}[];packages:{package_id:string;payload:Package;seen_at:string}[];mappings:Record<string,string>;products:Product[];truncated:boolean;environment:string };

export default function TrendyolSync() {
  const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [selection,setSelection]=useState<Record<string,string>>({});
  const pending=useRef(new Map<string,{siteSku:string;requestId:string;version:number}>());
  const readRef=useVisibleRead(()=>run('refresh'));
  const lines=useMemo(()=>{
    const unique=new Map<string,{sku:string;barcode:string|null;name:string}>();
    for(const row of state?.packages||[])for(const line of row.payload.lines)if(!unique.has(line.sku))unique.set(line.sku,{sku:line.sku,barcode:line.barcode||null,name:line.name});
    return [...unique.values()].sort((a,b)=>a.sku.localeCompare(b.sku));
  },[state]);
  async function refresh(){const r=await fetch('/api/admin/trendyol/sync',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setState(d);}
  async function run(action:'refresh'|'start'|'step',jobId?:string){setBusy(true);setMessage('');try{
    if(action!=='refresh'){const end=Date.now();const r=await fetch('/api/admin/trendyol/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='start'?{action,start:end-7*86400000,end}:{action,jobId})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(action==='start'?'İş oluşturuldu. İlk adımı çalıştırın.':d.complete?'Bu aralığın aktarımı tamamlandı.':'Sayfa kaydedildi. En az 5 saniye sonra sonraki adımı çalıştırın.');}
    await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:'İşlem doğrulanamadı.');}finally{setBusy(false);}}
  async function saveMapping(sku:string){const siteSku=selection[sku];if(!siteSku)return;setBusy(true);setMessage('');try{
    let request=pending.current.get(sku);
    if(!request||request.siteSku!==siteSku){
      const current=await fetch('/api/admin/phase2/records?'+new URLSearchParams({kind:'sku_mapping',key:sku}),{cache:'no-store'});
      const data=await current.json();if(!current.ok)throw new Error(data.error||'Eşleme okunamadı.');
      request={siteSku,requestId:crypto.randomUUID(),version:data.records?.[0]?.version||0};pending.current.set(sku,request);
    }
    const response=await fetch('/api/admin/phase2/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:request.requestId,expectedVersion:request.version,kind:'sku_mapping',key:sku,amount:siteSku,taxBasis:'inclusive',note:'Trendyol ürün kodu eşlemesi'})});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Eşleme kaydedilemedi.');
    pending.current.delete(sku);setMessage(`${sku} → ${siteSku} eşlemesi kaydedildi.`);await refresh();
  }catch(e){setMessage(e instanceof Error?e.message:'Eşleme doğrulanamadı.');}finally{setBusy(false);}}
  return <section ref={readRef} className="rounded-3xl border border-slate-200 bg-white p-5 space-y-5" aria-label="Trendyol senkronizasyonu ve ürün eşlemesi">
    <div><h2 className="text-xl font-bold">Trendyol aktarımı ve ürün kodları</h2><p className="text-sm text-slate-600 mt-1">Aynı SKU doğrudan, tekil eşleşen barkod otomatik bağlanır. Diğerlerini aşağıdan eşleyin. Eşleme stoğu değiştirmez; ürün maliyeti mağaza kaydından alınır.</p></div>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="rounded-full border px-4 py-2.5" onClick={()=>run('refresh')}>Kayıtları yenile</button><button type="button" disabled={busy} className="rounded-full bg-black px-4 py-2.5 text-white" onClick={()=>run('start')}>Son 7 günü aktar</button></div>
    <p role="status" className="text-sm">{message}</p>
    {state&&<>
      <p className="text-sm text-slate-600">Ortam: {state.environment} · Son {state.packages.length} paket kontrol edildi{state.truncated?'; eski paketler de arşivde korunuyor':''}.</p>
      {state.jobs.some(j=>j.status!=='complete')&&<div className="space-y-2">{state.jobs.filter(j=>j.status!=='complete').map(j=><div className="rounded-2xl border p-3 text-sm break-all" key={j.id}>Aktarım devam ediyor · {j.revision} sayfa <button type="button" disabled={busy} className="ml-2 rounded-full border px-3 py-2" onClick={()=>run('step',j.id)}>Sonraki adım</button></div>)}</div>}
      <div className="space-y-3"><h3 className="font-semibold">Ürün eşleşmeleri</h3>{!lines.length&&<p className="text-sm text-slate-600">Aktarılan paketlerde ürün bulunamadı.</p>}
        {lines.map(line=>{const mapped=state.mappings[line.sku];const siteSku=resolveSiteSku(line,state.products,new Map(Object.entries(state.mappings)));const method=mapped?'Elle kaydedildi':state.products.some(p=>p.SKU===line.sku)?'SKU aynı':siteSku?'Tekil barkod':'Eşleşme yok';return <article key={line.sku} className="rounded-2xl border border-slate-200 p-4 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><strong>{line.sku}</strong><p className="break-words text-slate-600">{line.name}</p></div><span className="rounded-full bg-slate-100 px-3 py-1">{method}: {siteSku||'—'}</span></div>
          <div className="mt-3 flex flex-wrap gap-2"><label className="sr-only" htmlFor={`map-${line.sku}`}>{line.sku} için mağaza ürünü</label><select id={`map-${line.sku}`} value={selection[line.sku]||''} disabled={busy} onChange={e=>setSelection({...selection,[line.sku]:e.target.value})} className="min-w-0 max-w-full flex-1 rounded-xl border px-3 py-2.5"><option value="">Gerekirse eşlemeyi değiştir</option>{state.products.map(p=><option key={p.SKU} value={p.SKU}>{p.SKU} · {p.name}</option>)}</select><button type="button" disabled={busy||!selection[line.sku]} onClick={()=>void saveMapping(line.sku)} className="rounded-full bg-black px-4 py-2.5 text-white disabled:opacity-40">Eşlemeyi kaydet</button></div>
        </article>;})}
      </div>
    </>}
  </section>;
}
