"use client";

import { useEffect, useState } from "react";

type PaytrWindow = Window & {
  iFrameResize?: (
    options: Record<string, unknown>,
    selector: string,
  ) => void;
};

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

  useEffect(() => {
    if (!isOpen || !iframeUrl) return;
    let attempts = 0;
    const initializeResizer = () => {
      const resize = (window as PaytrWindow).iFrameResize;
      if (typeof resize !== "function") return false;
      resize(
        { checkOrigin: ["https://www.paytr.com"], scrolling: true },
        "#paytriframe",
      );
      return true;
    };
    if (initializeResizer()) return;
    const interval = window.setInterval(() => {
      attempts += 1;
      if (initializeResizer() || attempts >= 40) window.clearInterval(interval);
    }, 250);
    return () => window.clearInterval(interval);
  }, [iframeUrl, isOpen]);

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
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 p-0 backdrop-blur-sm md:p-4">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white shadow-2xl md:h-[90vh] md:max-w-3xl md:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 p-4 md:p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Güvenli Ödeme
            </p>
            <h2 className="text-lg font-black text-black">PayTR Ödeme Formu</h2>
            <p className="mt-1 text-[11px] font-bold text-gray-500">
              Sipariş No: {merchantOid}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-full bg-gray-100 font-black hover:bg-gray-200"
            aria-label="Ödeme formunu kapat"
          >
            ✕
          </button>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
          <p className="text-[11px] font-bold leading-relaxed text-amber-900">
            Bankanız 3D Secure ekranını burada engellerse ödemeyi tam sayfada
            açın.
          </p>
          <a
            href={iframeUrl}
            className="shrink-0 rounded-xl bg-black px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-gray-800"
          >
            Tam Sayfada Aç
          </a>
        </div>

        <div
          className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain bg-[#20242a]"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {!isIframeLoaded && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white px-6 text-center"
              role="status"
              aria-live="polite"
            >
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-black" />
              <p className="mt-4 text-sm font-black text-black">
                PayTR güvenli ödeme ekranı yükleniyor
              </p>
              <p className="mt-2 max-w-sm text-xs font-medium text-gray-500">
                Banka ve 3D Secure bağlantısı kuruluyor. Bu pencereyi kapatmayın.
              </p>
              {isTakingLong && (
                <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800">
                  Bağlantı beklenenden uzun sürdü. İnternet bağlantınızı kontrol
                  edin; ekran açılmazsa pencereyi kapatıp yeniden deneyin.
                </p>
              )}
            </div>
          )}
          <iframe
            id="paytriframe"
            key={iframeUrl}
            src={iframeUrl}
            title="PayTR Ödeme Formu"
            className="block min-h-full w-full bg-white"
            frameBorder="0"
            scrolling="yes"
            loading="eager"
            onLoad={() => setLoadedIframeUrl(iframeUrl)}
          />
        </div>
      </div>
    </div>
  );
}
