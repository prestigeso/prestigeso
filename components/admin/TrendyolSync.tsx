'use client';
import { useState } from 'react';
import type { projectStream } from '@/lib/trendyol/stream';
import {useVisibleRead} from './hooks/useVisibleRead';
type Package=ReturnType<typeof projectStream>['packages'][number];
type State={jobs:{id:string;revision:number;status:string;updated_at:string}[];packages:{package_id:string;payload:Package;seen_at:string}[];mappings:Record<string,string>;truncated:boolean;environment:string};
export default function TrendyolSync(){
 const [state,setState]=useState<State|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const readRef=useVisibleRead(()=>run('refresh'));
 async function refresh(){const r=await fetch('/api/admin/trendyol/sync',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setState(d);}
 async function run(action:'refresh'|'start'|'step',jobId?:string){setBusy(true);setMessage('');try{
  if(action!=='refresh'){const end=Date.now();const r=await fetch('/api/admin/trendyol/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='start'?{action,start:end-7*86400000,end}:{action,jobId})});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(action==='start'?'İş oluşturuldu. İlk adımı çalıştırın.':d.complete?'Bu aralığın aktarımı tamamlandı.':'Sayfa kaydedildi. En az 5 saniye sonra sonraki adımı çalıştırın.');}
  await refresh();
 }catch(e){setState(null);setMessage(e instanceof Error?e.message:'İşlem doğrulanamadı.');}finally{setBusy(false);}}
 return <section ref={readRef} className="border rounded-2xl bg-white p-5 space-y-3"><h2 className="text-xl font-bold">Trendyol kalıcı aktarım & eşleme</h2>
  <p className="text-sm">API bağlantısı sonrasında etkinleştirilir. Her adım en fazla 50 paketi kaydeder. Yarım işler tamamlandı sayılmaz; yeniden başlatılan aralıklar paketleri çoğaltmaz. Site stoğu/cirosu değişmez. Son 100 kayıt gösterilir; mağazanın tüm siparişleri değildir. Cursor süresi dolarsa son 7 gün aktarımını yeniden başlatın.</p>
  <div className="flex flex-wrap gap-2"><button disabled={busy} className="border p-2" onClick={()=>run('refresh')}>Kayıtları ve işleri yenile</button><button disabled={busy} className="border p-2" onClick={()=>run('start')}>Son 7 gün aktarımını başlat</button></div>
  <p role="status">{message}</p>
  {state && <><p>Ortam: {state.environment}</p><ul>{state.jobs.map(j=><li className="border p-2 break-all" key={j.id}>{j.id} · {j.status==='complete'?'Tamamlandı':'Devam bekliyor'} · {j.revision} sayfa {j.status!=='complete'&&<button disabled={busy} className="border p-2 ml-2" onClick={()=>run('step',j.id)}>Sonraki adım</button>}</li>)}</ul>
   {state.packages.map(p=><article key={p.package_id} className="border p-3 text-sm break-words"><strong>{p.payload.orderNumber} / paket {p.package_id}</strong><p>{p.payload.status} · {p.payload.amount} {p.payload.currency} · Kayıt tarihi {p.seen_at}</p>{p.payload.lines.map((l,i)=><p key={i}>{l.quantity} × {l.name}: {l.sku} → {state.mappings[l.sku] || 'Eşleme yok — maliyet/stok işlemi uygulanmaz'}</p>)}</article>)}{state.truncated&&<p>100 kayıt sınırı: daha eski paketler veritabanında korunur, burada gösterilmiyor.</p>}</>}
 </section>;
}
