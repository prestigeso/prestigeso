'use client';
import { useRef, useState } from 'react';
import type { FinanceRecordInput } from '@/lib/finance/records';
import {useVisibleRead} from './hooks/useVisibleRead';
type Row = { kind: string; resource_key: string; version: number; payload: { amountMinor?: number | null; taxBasis?: string; siteSku?: string; note: string } };
const kinds = { product_cost: 'Ürün birim maliyeti', order_cost: 'Sipariş maliyet düzeltmesi', advertising: 'Manuel reklam gideri', sku_mapping: 'Trendyol SKU eşleme' };
const hints = { product_cost: 'Sitedeki SKU (ör. Q316)', order_cost: 'Sipariş ID:kalem (ör. 123:shipping). Kalemler: goods, paymentFees, packaging, shipping, returnCosts', advertising: 'YYYY-MM-DD:kampanya (gün: Europe/Istanbul; ör. 2026-09-19:meta-kolye)', sku_mapping: 'Trendyol SKU; tutar yerine sitedeki SKU girilir. Stok aktarımı yapmaz.' };
export default function Phase2Records() {
  const [kind, setKind] = useState<FinanceRecordInput['kind']>('product_cost');
  const [key, setKey] = useState(''), [amount, setAmount] = useState(''), [taxBasis, setBasis] = useState<'inclusive' | 'exclusive'>('inclusive'), [note, setNote] = useState('');
  const [version, setVersion] = useState(0), [rows, setRows] = useState<Row[]>([]), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const pending = useRef<{ signature: string; id: string } | null>(null);
  const [reading, setReading] = useState(false);
  const selection = useRef({kind, key});
  const readSequence = useRef(0);
  const readRef=useVisibleRead(()=>load(false),kind);
  async function load(history = false) {
    const sequence = ++readSequence.current;
    const requested = {kind, key};
    setReading(true); setMessage('');
    try {
      const r = await fetch(`/api/admin/phase2/records?${new URLSearchParams({ kind, key: key.trim(), history: history ? '1' : '0' })}`, { cache: 'no-store' });
      const data = await r.json(); if (!r.ok) throw new Error(data.error);
      if (sequence !== readSequence.current || selection.current.kind !== requested.kind || selection.current.key !== requested.key) return;
      setRows(data.records); if (!history) { setVersion(data.records[0]?.version || 0); setLoaded(Boolean(key.trim())); }
      setMessage(data.truncated ? 'İlk 100 kayıt gösteriliyor; tam liste değildir. Anahtar ile daraltın.' : 'Kayıtlar yüklendi.');
    } catch (e) { if (sequence === readSequence.current && selection.current.kind === requested.kind && selection.current.key === requested.key) { setLoaded(false); setMessage(e instanceof Error ? e.message : 'Okunamadı.'); } } finally { if (sequence === readSequence.current) setReading(false); }
  }
  async function save() {
    setBusy(true); setMessage('');
    const input = { kind, key: key.trim(), amount, taxBasis, note, expectedVersion: version };
    const signature = JSON.stringify(input);
    if (pending.current?.signature !== signature) pending.current = { signature, id: crypto.randomUUID() };
    try {
      const r = await fetch('/api/admin/phase2/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, requestId: pending.current.id }) });
      const data = await r.json(); if (!r.ok) { if (r.status === 409) setLoaded(false); throw new Error(data.error); }
      setVersion(data.version); setLoaded(false); pending.current = null; setMessage(`Kaydedildi — sürüm ${data.version}. Yeni değişiklik için tekrar yükleyin.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Kaydetme doğrulanamadı. Aynı alanlarla tekrar deneyin.'); } finally { setBusy(false); }
  }
  return <section ref={readRef} className="bg-white border rounded-2xl p-5 space-y-4"><h2 className="text-xl font-bold">Kalıcı maliyet kayıtları & SKU eşleme</h2>
    <p className="text-sm">TRY · Vergi esası her kayıtta seçilir. Boş maliyet bilinmeyendir; 0 gerçek sıfırdır. Düzeltmeler eski kaydı silmez. Ürün maliyetleri yalnız yeni siparişlere kopyalanır. Sipariş düzeltmesi önceki tutarın yerine geçer, ek gider olarak iki kez toplanmaz. Net kâr raporu değildir.</p>
    <fieldset disabled={busy} className="grid md:grid-cols-2 gap-3">
      <label>Kayıt türü<select className="border p-2 block w-full" value={kind} onChange={e => { selection.current = {kind: e.target.value as typeof kind, key}; setKind(e.target.value as typeof kind); setLoaded(false); setRows([]); setVersion(0); }}>{Object.entries(kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Kayıt anahtarı<input className="border p-2 block w-full" value={key} maxLength={160} onChange={e => { selection.current = {kind, key: e.target.value}; setKey(e.target.value); setLoaded(false); }} /></label>
      <p className="text-sm md:col-span-2 break-words">{hints[kind]}</p>
      <label>{kind === 'sku_mapping' ? 'Site SKU' : 'Tutar (TL)'}<input className="border p-2 block w-full" value={amount} maxLength={100} onChange={e => setAmount(e.target.value)} /></label>
      <label>Vergi esası<select disabled={kind === 'sku_mapping'} className="border p-2 block w-full" value={taxBasis} onChange={e => setBasis(e.target.value as typeof taxBasis)}><option value="inclusive">KDV dahil</option><option value="exclusive">KDV hariç</option></select></label>
      <label className="md:col-span-2">Kaynak / düzeltme gerekçesi (kişisel veri yazmayın)<textarea className="border p-2 block w-full" value={note} maxLength={500} onChange={e => setNote(e.target.value)} /></label>
      <button type="button" className="border rounded p-2" onClick={() => load(false)}>Güncel kaydı yükle</button><button type="button" className="border rounded p-2" onClick={() => load(true)}>Değişiklik geçmişi</button>
      <button type="button" disabled={reading || !loaded || note.trim().length < 3} className="bg-black text-white rounded p-2 disabled:opacity-40" onClick={save}>Kaydı kaydet</button>
    </fieldset>
    <p role="status">{message}</p>
    <ul className="space-y-2">{rows.map(r => <li className="border p-2 break-words text-sm" key={`${r.resource_key}:${r.version}`}>{r.resource_key} · v{r.version} · {r.payload.siteSku || (r.payload.amountMinor === null ? 'Bilinmiyor' : `${(r.payload.amountMinor || 0) / 100} TL`)} · {r.payload.taxBasis === 'inclusive' ? 'KDV dahil' : r.payload.taxBasis === 'exclusive' ? 'KDV hariç' : ''}<p>{r.payload.note}</p></li>)}</ul>
  </section>;
}
