'use client';
import { useState } from 'react';
import {useVisibleRead} from './hooks/useVisibleRead';
type Connection = { property: string; permission: string; checkedAt: string };
const permissions: Record<string, string> = { siteOwner: 'Mülk sahibi', siteFullUser: 'Tam kullanıcı', siteRestrictedUser: 'Kısıtlı kullanıcı' };
export default function SearchConnection() {
  const [result, setResult] = useState<Connection | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const readRef=useVisibleRead(check);
  async function check() {
    setBusy(true); setResult(null); setError('');
    try {
      const r = await fetch('/api/admin/phase2/search-console/status', { cache: 'no-store', signal: AbortSignal.timeout(30000) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error); setResult(data);
    } catch (e) { setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Bağlantı kontrolü zaman aşımına uğradı. Tekrar deneyin.'); } finally { setBusy(false); }
  }
  return <section ref={readRef} className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-2">
    <button disabled={busy} onClick={check} className="border rounded p-2">{busy ? 'Google bağlantısı denetleniyor…' : 'Google bağlantısını kontrol et'}</button>
    <p className="text-sm">Kontrol yalnız bu sunucunun bağlantısını sınar. Vercel değişkenleri yeni deployment sonrası kullanılır. Hiçbir anahtar burada gösterilmez.</p>
    {error && <p role="alert">{error}</p>}
    {result && <p role="status" className="text-sm text-green-800 break-words">Google bağlantısı doğrulandı · {result.property} · {permissions[result.permission] || result.permission} · {new Date(result.checkedAt).toLocaleString('tr-TR')} · Salt okunur. Bu kontrol indekslenme veya trafik garantisi değildir.</p>}
  </section>;
}
