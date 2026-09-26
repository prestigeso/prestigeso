"use client";
import { useCallback, useEffect, useState } from 'react';

// Mounted once by the authenticated admin shell, not by individual menus.
export function useTrendyolEntrySync() {
  const [run, setRun] = useState(0);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRun(n => n + 1), []);
  useEffect(() => {
    const c = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let pages = 0;
    let financePages = 0;
    let retries = 0;
    const key = 'prestigeso:trendyol-entry-check-v2';
    async function financeStep() {
      if (c.signal.aborted) return;
      if (document.visibilityState === 'hidden' || !navigator.onLine) { setBusy(false);setMessage('Finans kontrolü durdu; yeniden kontrol edebilirsiniz.');return; }
      try {
        const response = await fetch('/api/admin/trendyol/finance-sync', { method:'POST',signal:AbortSignal.any([c.signal,AbortSignal.timeout(30000)]) });
        const data = await response.json();
        if (c.signal.aborted) return;
        if ((response.status === 429 || (response.status >= 500 && !data.disabled && !data.configuration)) && retries++ < 2) { timer=setTimeout(financeStep,10000*retries);return; }
        if (!response.ok) throw Error(data.error || 'İade kontrolü alınamadı.');
        retries=0;financePages++;
        if (data.complete) {
          setRevision(n=>n+1);
          try { sessionStorage.setItem(key,String(Date.now())); } catch {}
          setMessage('Sipariş, iade ve cari hesap arşivi güncel.');setBusy(false);return;
        }
        if (financePages >= 12) { setMessage('İade geçmişi aktarılıyor; sonraki girişte devam edecek. Kâr raporu eksik veriyi hesaplamaz.');setBusy(false);return; }
        setMessage('Trendyol iadeleri ve cari hesap kayıtları kontrol ediliyor.');
        timer=setTimeout(financeStep,5500);
      } catch(error) { if (!c.signal.aborted) { setMessage((error instanceof Error ? error.message : 'İade kontrolü alınamadı.')+' Kâr raporu eksik veriyi hesaplamaz.');setBusy(false); } }
    }
    async function step() {
      if (c.signal.aborted) return;
      if (document.visibilityState === 'hidden' || !navigator.onLine) {
        setBusy(false);
        setMessage('Otomatik kontrol durdu. İsterseniz yeniden kontrol edebilirsiniz.');
        return;
      }
      setBusy(true);
      try {
        const response = await fetch('/api/admin/trendyol/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'auto' }), signal: AbortSignal.any([c.signal, AbortSignal.timeout(30000)]) });
        const data = await response.json();
        if (c.signal.aborted) return;
        if ((response.status === 429 || (response.status >= 500 && !data.disabled && !data.configuration)) && retries++ < 2) {
          setMessage('Kontrol geçici olarak bekliyor; yeniden deneniyor.');
          timer = setTimeout(step, 10000 * retries);
          return;
        }
        if (!response.ok) throw Error(data.error || 'Güncelleme alınamadı.');
        retries = 0;
        pages++;
        if (data.complete) {
          if (!data.fresh || pages > 1) setRevision(n => n + 1);
          setMessage('Sipariş arşivi güncel; iadeler kontrol ediliyor.');
          timer = setTimeout(financeStep, 5500);
          return;
        }
        if (pages >= 20) {
          setRevision(n => n + 1);
          setMessage('Bu kontroldeki aktarım sınırına ulaşıldı. Devam etmek için yeni siparişleri kontrol edin.');
          setBusy(false);
          return;
        }
        setMessage('Trendyol siparişleri güncelleniyor; kayıtlı siparişleri inceleyebilirsiniz.');
        timer = setTimeout(step, 5500);
      } catch (error) {
        if (c.signal.aborted) return;
        setMessage((error instanceof Error ? error.message : 'Güncelleme alınamadı.') + ' Kayıtlı siparişler korunuyor.');
        setBusy(false);
      }
    }
    let recent = false;
    try {
      const last = Number(sessionStorage.getItem(key));
      recent = last > 0 && Date.now() - last >= 0 && Date.now() - last < 300000;
    } catch {}
    if (run === 0 && recent) {
      timer = setTimeout(() => setMessage('Trendyol son 5 dakika içinde kontrol edildi.'), 0);
    } else timer = setTimeout(step, 500);
    return () => { c.abort(); clearTimeout(timer); };
  }, [run]);
  return { message, busy, revision, refresh };
}
