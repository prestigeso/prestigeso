"use client";

import { useEffect } from "react";
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from "@/lib/browserStorage";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  parseCookieConsent,
} from "@/lib/legal/consent";
import { createConsentBoundTask } from "@/lib/legal/consentTask";

export function useConsentedView(productId?: number, onRecord?: () => void) {
  useEffect(() => {
    const productView = productId !== undefined;
    if (productView && (!Number.isSafeInteger(productId) || productId <= 0))
      return;
    const sessionKey = productView
      ? `viewed_product_log_${productId}`
      : "prestige_session_active";
    const allowed = () => {
      // applyCookieConsent updates this immediately even if storage is blocked/full.
      const applied = document.documentElement.dataset.consentAnalytics;
      if (applied === "true" || applied === "false") return applied === "true";
      return (
        parseCookieConsent(safeStorageGet("local", COOKIE_CONSENT_STORAGE_KEY))
          ?.analytics === true
      );
    };
    const task = createConsentBoundTask({
      allowed,
      onRevoke: () => {
        safeStorageRemove("session", sessionKey);
        safeStorageRemove("local", "prestige_last_view");
        safeStorageRemove("local", "prestige_viewed");
      },
      run: async (signal) => {
        if (!allowed() || signal.aborted) return;
        onRecord?.();
        if (safeStorageGet("session", sessionKey)) return;
        if (
          !productView &&
          Date.now() -
            Number(safeStorageGet("local", "prestige_last_view") || 0) <=
            30 * 60 * 1000
        )
          return;
        const response = await fetch(
          productView ? "/api/product-views" : "/api/page_views",
          {
            method: "POST",
            signal,
            ...(productView
              ? {
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productId }),
                }
              : {}),
          },
        );
        if (response.ok && !signal.aborted && allowed()) {
          safeStorageSet("session", sessionKey, "true");
          if (!productView)
            safeStorageSet("local", "prestige_last_view", String(Date.now()));
        }
      },
    });
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === COOKIE_CONSENT_STORAGE_KEY) {
        document.documentElement.dataset.consentAnalytics = String(
          parseCookieConsent(
            safeStorageGet("local", COOKIE_CONSENT_STORAGE_KEY),
          )?.analytics === true,
        );
        task.sync();
      }
    };
    window.addEventListener("prestigeso:consent-changed", task.sync);
    window.addEventListener("storage", onStorage);
    task.sync();
    return () => {
      task.dispose();
      window.removeEventListener("prestigeso:consent-changed", task.sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [productId, onRecord]);
}
