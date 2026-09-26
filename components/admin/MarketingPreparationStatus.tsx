'use client';
import {useState} from 'react';
import {useVisibleRead} from './hooks/useVisibleRead';
export default function MarketingPreparationStatus(){const [message,setMessage]=useState('Hazırlık varsayılan kapalıdır.'),[busy,setBusy]=useState(false);
 const readRef=useVisibleRead(load);
 async function load(){setBusy(true);try{const r=await fetch('/api/admin/phase2/preparation',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error);setMessage(d.preparationEnabled?`Bekletilen: ${d.held} · İzin geri çekildiği için iptal: ${d.cancelled} · Meta gönderimi: kapalı`:'İzin/kuyruk hazırlığı kapalı; Meta gönderimi yok.');}catch(e){setMessage(e instanceof Error?e.message:'Durum alınamadı.');}finally{setBusy(false);}}
 return <section ref={readRef} className="border bg-white rounded-2xl p-5 space-y-3"><h2 className="text-xl font-bold">Meta izin & olay hazırlığı</h2><p className="text-sm">Sadece izinli ve sunucuda doğrulanmış gerçek satın alımlar için bekletilen kayıt altyapısı. Pixel/CAPI aynı olay kimliğini kullanacak. İzin geri çekilince payload silinir. SDK, canlı gönderici ve otomatik reklam atfı açık değildir; kuyruk sayısı Meta teslimatı veya ROAS değildir.</p><button className="border p-2" disabled={busy} onClick={load}>Hazırlık durumunu getir</button><p role="status">{message}</p></section>;
}
