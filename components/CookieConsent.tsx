"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (consent) return;
    const frame = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const saveConsent = (nextAnalytics: boolean, nextMarketing: boolean) => {
    localStorage.setItem(
      "cookie_consent",
      JSON.stringify({ necessary: true, analytics: nextAnalytics, marketing: nextMarketing, updatedAt: new Date().toISOString() }),
    );
    setIsVisible(false);
    setShowPreferences(false);
  };

  if (!isVisible)
    return (
      <button type="button" onClick={() => setIsVisible(true)} className="fixed bottom-3 left-3 z-40 rounded-full border border-gray-200 bg-white px-3 py-2 text-[9px] font-bold text-gray-500 shadow-sm">
        Çerez tercihleri
      </button>
    );

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 md:p-6 shadow-2xl z-50 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex-1 text-[11px] md:text-sm text-gray-600">
        <p>
          Sizlere daha iyi bir alışveriş deneyimi sunabilmek için sitemizde
          zorunlu çerezler kullanıyoruz. Analitik ve pazarlama çerezleri yalnızca
          açık onayınızla etkinleştirilir. Detaylı bilgi için{" "}
          <Link href="/kvkk" className="underline font-medium text-black">
            Aydınlatma Metni
          </Link>
          &apos;ni inceleyebilirsiniz.
        </p>
      </div>
      {showPreferences && (
        <div className="flex w-full flex-col gap-2 rounded-xl bg-gray-50 p-3 text-xs md:w-auto">
          <label className="flex items-center justify-between gap-6"><span>Zorunlu</span><input type="checkbox" checked disabled /></label>
          <label className="flex items-center justify-between gap-6"><span>Analitik</span><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /></label>
          <label className="flex items-center justify-between gap-6"><span>Pazarlama</span><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /></label>
        </div>
      )}
      <div className="flex w-full flex-shrink-0 flex-col gap-2 sm:flex-row md:w-auto">
        <button
          onClick={() => saveConsent(false, false)}
          className="w-full border border-gray-300 px-4 py-2.5 text-xs font-bold uppercase md:w-auto"
        >
          Yalnızca zorunlu
        </button>
        <button type="button" onClick={() => setShowPreferences((value) => !value)} className="w-full border border-gray-300 px-4 py-2.5 text-xs font-bold uppercase md:w-auto">
          Tercihler
        </button>
        <button
          onClick={() => saveConsent(true, true)}
          className="w-full bg-black px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-gray-800 md:w-auto"
        >
          Tümünü kabul et
        </button>
      </div>
    </div>
  );
}
