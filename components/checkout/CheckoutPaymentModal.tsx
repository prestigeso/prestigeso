"use client";

import { useEffect, useState } from "react";

type CheckoutPaymentModalProps = {
  isOpen: boolean;
  iframeUrl: string;
  merchantOid: string;
  onClose: () => void;
};

export default function CheckoutPaymentModal({
  isOpen,
  iframeUrl,
  merchantOid,
  onClose,
}: CheckoutPaymentModalProps) {
  const [loadedIframeUrl, setLoadedIframeUrl] = useState("");
  const [slowIframeUrl, setSlowIframeUrl] = useState("");
  const isIframeLoaded = loadedIframeUrl === iframeUrl;
  const isTakingLong = slowIframeUrl === iframeUrl;

  useEffect(() => {
    if (!isOpen || !iframeUrl) return;
    const timeout = window.setTimeout(() => setSlowIframeUrl(iframeUrl), 12_000);
    return () => window.clearTimeout(timeout);
  }, [iframeUrl, isOpen]);

  // GÜVENLİK: Sadece PayTR domain'inden gelen URL'leri kabul et
  const isValidPaytrUrl = (() => {
    try {
      const url = new URL(iframeUrl);
      return url.protocol === "https:" && url.hostname === "www.paytr.com";
    } catch {
      return false;
    }
  })();

  if (!isOpen || !iframeUrl || !isValidPaytrUrl) return null;

  return (
    <div className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full h-full md:h-[90vh] md:max-w-3xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Güvenli Ödeme
            </p>

            <h2 className="text-lg font-black text-black">PayTR Ödeme Formu</h2>

            <p className="text-[11px] font-bold text-gray-500 mt-1">
              Sipariş No: {merchantOid}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full font-black hover:bg-gray-200"
            aria-label="Ödeme formunu kapat"
          >
            ✕
          </button>
        </div>

        <div className="relative flex-1 bg-[#20242a]">
          {!isIframeLoaded && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-6 text-center"
              role="status"
              aria-live="polite"
            >
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
              <p className="mt-4 text-sm font-black text-black">
                PayTR gÃ¼venli Ã¶deme ekranÄ± yÃ¼kleniyor
              </p>
              <p className="mt-2 max-w-sm text-xs font-medium text-gray-500">
                Banka ve 3D Secure baÄŸlantÄ±sÄ± kuruluyor. Bu pencereyi kapatmayÄ±n.
              </p>
              {isTakingLong && (
                <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                  BaÄŸlantÄ± beklenenden uzun sÃ¼rdÃ¼. Ä°nternet baÄŸlantÄ±nÄ±zÄ± kontrol
                  edin; ekran aÃ§Ä±lmazsa pencereyi kapatÄ±p yeniden deneyin.
                </p>
              )}
            </div>
          )}
          <iframe
            key={iframeUrl}
          src={iframeUrl}
          title="PayTR Ödeme Formu"
          className="h-full w-full bg-white"
          frameBorder="0"
          scrolling="yes"
          loading="eager"
          onLoad={() => {
            setLoadedIframeUrl(iframeUrl);
          }}
        />
        </div>
      </div>
    </div>
  );
}
