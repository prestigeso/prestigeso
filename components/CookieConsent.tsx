"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  applyCookieConsent,
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  parseCookieConsent,
  type CookieConsentPreferences,
} from "@/lib/legal/consent";
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from "@/lib/browserStorage";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = parseCookieConsent(
      safeStorageGet("local", COOKIE_CONSENT_STORAGE_KEY),
    );
    const frame = requestAnimationFrame(() => {
      if (consent) {
        setAnalytics(consent.analytics);
        setMarketing(consent.marketing);
        applyCookieConsent(consent);
      } else {
        setIsVisible(true);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const saveConsent = (nextAnalytics: boolean, nextMarketing: boolean) => {
    const preferences: CookieConsentPreferences = {
      version: COOKIE_CONSENT_VERSION,
      necessary: true,
      analytics: nextAnalytics,
      marketing: nextMarketing,
      updatedAt: new Date().toISOString(),
    };
    safeStorageSet(
      "local",
      COOKIE_CONSENT_STORAGE_KEY,
      JSON.stringify(preferences),
    );
    safeStorageRemove("local", "cookie_consent");
    setAnalytics(nextAnalytics);
    setMarketing(nextMarketing);
    applyCookieConsent(preferences);
    setIsVisible(false);
    setShowPreferences(false);
  };

  if (!isVisible)
    return (
      <button
        type="button"
        onClick={() => {
          const consent = parseCookieConsent(
            safeStorageGet("local", COOKIE_CONSENT_STORAGE_KEY),
          );
          if (consent) {
            setAnalytics(consent.analytics);
            setMarketing(consent.marketing);
          }
          setShowPreferences(true);
          setIsVisible(true);
        }}
        className="fixed bottom-3 left-3 z-40 rounded-full border border-gray-200 bg-white px-3 py-2 text-[9px] font-bold text-gray-500 shadow-sm"
      >
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
          <label className="flex items-center justify-between gap-6"><span>Zorunlu</span><input type="checkbox" checked disabled readOnly /></label>
          <label className="flex items-center justify-between gap-6"><span>Analitik</span><input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} /></label>
          <label className="flex items-center justify-between gap-6"><span>Pazarlama</span><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /></label>
        </div>
      )}
      <div className="flex w-full flex-shrink-0 flex-col gap-2 sm:flex-row md:w-auto">
        <button
          type="button"
          onClick={() => saveConsent(false, false)}
          className="w-full border border-gray-300 px-4 py-2.5 text-xs font-bold uppercase md:w-auto"
        >
          Yalnızca zorunlu
        </button>
        <button type="button" onClick={() => setShowPreferences((value) => !value)} className="w-full border border-gray-300 px-4 py-2.5 text-xs font-bold uppercase md:w-auto">
          Tercihler
        </button>
        {showPreferences && (
          <button
            type="button"
            onClick={() => saveConsent(analytics, marketing)}
            className="w-full border border-black px-4 py-2.5 text-xs font-bold uppercase md:w-auto"
          >
            Seçimleri kaydet
          </button>
        )}
        <button
          type="button"
          onClick={() => saveConsent(true, true)}
          className="w-full bg-black px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:bg-gray-800 md:w-auto"
        >
          Tümünü kabul et
        </button>
      </div>
    </div>
  );
}
