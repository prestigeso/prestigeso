'use client';

import { useCallback, useEffect, useState } from 'react';

type PaymentIssue = { id: number; order_id: number; kind: string; reason_code: string; confirmed_amount: number; created_at: string };
type EmailIssue = { id: string; order_id: number; event_key: string; status: string; attempts: number; error_code: string | null;
  first_attempt_at: string | null; next_attempt_at: string | null; created_at: string };
type Queue = { payments: PaymentIssue[]; emails: EmailIssue[] };

export default function AdminOperationsQueue({ onOpenOrders }: { onOpenOrders: () => void }) {
  const [queue, setQueue] = useState<Queue>({ payments: [], emails: [] });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/operations', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Kuyruk okunamadı.');
      setQueue(result); setError('');
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Kuyruk okunamadı.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function retry(id: string) {
    if (busy) return;
    setBusy(id); setMessage('');
    try {
      const response = await fetch('/api/admin/operations', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispatch_email', id }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gönderim kontrol edilemedi.');
      setMessage(result.result?.status === 'sent' ? 'Gönderim sağlayıcı tarafından kabul edildi.' :
        result.result?.status === 'not_configured' ? 'Resend gönderici ve API ayarlarını kontrol edin.' :
        'Kayıt korundu. Zaman penceresi veya sonuç belirsizliği nedeniyle tekrar gönderilmiş olmayabilir.');
      await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Gönderim kontrol edilemedi.'); }
    finally { setBusy(null); }
  }

  return <section className="rounded-2xl border border-amber-200 bg-white p-5" aria-label="Operasyon kuyruğu">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-bold">Ödeme ve e-posta operasyon kuyruğu</h2>
      <button type="button" onClick={() => void load()} className="rounded-lg border px-3 py-2 text-sm">Yenile</button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    {!error && queue.payments.length === 0 && queue.emails.length === 0 &&
      <p className="mt-3 text-sm text-gray-600">Çözüm bekleyen ödeme veya e-posta kaydı yok.</p>}
    {queue.payments.length > 0 && <div className="mt-4 space-y-2">
      <p className="text-sm font-semibold text-red-700">Ödeme, stok/teslimat veya alıcı kontrolü bekliyor. Tutar sipariş kayıt tutarıdır; sağlayıcı paneliyle doğrulayın. Otomatik ikinci ödeme ya da iade başlatılmadı.</p>
      {queue.payments.map(item => <p key={item.id} className="text-sm">Sipariş #{item.order_id} · {(item.confirmed_amount / 100).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} · {item.reason_code}</p>)}
      <button type="button" onClick={onOpenOrders} className="rounded-lg bg-black px-3 py-2 text-sm text-white">Siparişleri kontrol et</button>
    </div>}
    {queue.emails.length > 0 && <div className="mt-4 space-y-3">
      <p className="text-sm text-gray-600">Belirsiz gönderimler yalnız aynı kayıt/anahtarla, ilk denemeden itibaren 23 saat içinde tekrar denenebilir. Daha eski belirsiz kayıtlar Resend panelinden elle doğrulanmalıdır. İlk 50 açık kayıt gösterilir.</p>
      {queue.emails.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm">
        <span>Sipariş #{item.order_id} · {item.event_key.startsWith('invoice:') ? 'Fatura' : item.event_key === 'order_delivered' ? 'Teslimat bildirimi' : 'Sipariş onayı'} · {item.status} ({item.attempts}/5) {item.error_code ? `· ${item.error_code}` : ''}</span>
        <button type="button" disabled={busy !== null || !item.next_attempt_at} onClick={() => void retry(item.id)}
          className="rounded-lg border px-3 py-2 disabled:opacity-40">{busy === item.id ? 'Kontrol ediliyor…' : 'Güvenli gönderim denemesi'}</button>
      </div>)}
    </div>}
  </section>;
}
