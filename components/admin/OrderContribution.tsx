'use client';
import { useState } from 'react';
import type { orderContribution } from '@/lib/finance/orderContribution';
type Report = ReturnType<typeof orderContribution> & { snapshotAt: string | null };
export default function OrderContribution() {
  const [id, setId] = useState(''), [report, setReport] = useState<Report | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setReport(null); setError('');
    try { const r = await fetch(`/api/admin/phase2/order?id=${encodeURIComponent(id)}`, { cache: 'no-store' }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setReport(data); }
    catch (e) { setError(e instanceof Error ? e.message : 'Rapor alınamadı.'); } finally { setBusy(false); }
  }
  return <section className="bg-white border rounded-2xl p-5 space-y-3"><h2 className="text-xl font-bold">Gerçek sipariş katkısı</h2>
    <p className="text-sm">Yalnız doğrulanmış site tahsilatı. KDV dahil maliyetler karşılaştırılır; hariç kayıtlar bilinmeyen bırakılır. Trendyol satışları site cirosuna eklenmez.</p>
    <label>Sipariş veritabanı ID<input className="block border p-2" disabled={busy} value={id} onChange={e => { setId(e.target.value); setReport(null); }} inputMode="numeric" /></label><button disabled={busy} className="border p-2" onClick={load}>Sipariş katkısını getir</button>
    {error && <p role="alert">{error}</p>}
    {report && <><p>Maliyet kopyası: {report.snapshotAt || 'Yok — eski siparişe bugünkü maliyet uygulanmadı.'}</p>{report.result && <><p>İade sonrası gelir: {report.result.netRevenue === null ? 'Bilinmiyor' : `${report.result.netRevenue / 100} TL`}</p><p>Reklam öncesi katkı: {report.result.beforeAdvertising === null ? 'Eksik maliyet nedeniyle hesaplanamıyor' : `${report.result.beforeAdvertising / 100} TL`}</p><p>Eksik kalemler: {report.result.missing.join(', ')}</p></>}{report.warnings.map(w => <p className="text-sm" key={w}>{w}</p>)}</>}
  </section>;
}
