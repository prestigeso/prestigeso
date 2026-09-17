"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analyticsAllowed, analyticsCartId, analyticsAttemptId, flushAnalytics, revokeAnalytics, trackAnalytics, trackCategory } from "@/lib/analytics/client";
import { COOKIE_CONSENT_STORAGE_KEY, parseCookieConsent } from "@/lib/legal/consent";
import { safeStorageGet } from "@/lib/browserStorage";

export default function AnalyticsTracker() {
  const pathname = usePathname(), params = useSearchParams();
  const category = params.get("category") || "";
  // Never send URL query strings: they can contain personal information or payment tokens.
  useEffect(() => {
    let cleanup = () => {}, running = false;
    const sync = () => {
      if (!analyticsAllowed()) { cleanup(); running = false; revokeAnalytics(); return; }
      if (running) return;
      running = true;
      trackAnalytics("page_view");
      const product = pathname.match(/^\/product\/(\d+)\/?$/);
      if (product) trackAnalytics("product_view", { productId: Number(product[1]) });
      if (category) trackCategory(category);
      if (pathname === "/checkout") { const cartId = analyticsCartId(), attemptId = analyticsAttemptId(); if (cartId && attemptId) trackAnalytics("begin_checkout", { cartId, attemptId }); }
      let activeSeconds = 0, lastInteraction = Date.now();
      const activity = () => { lastInteraction = Date.now(); };
      const tick = setInterval(() => {
        if (document.visibilityState === "visible" && Date.now() - lastInteraction < 60000) activeSeconds++;
        if (activeSeconds >= 15) { trackAnalytics("active_time", { seconds: activeSeconds }); activeSeconds = 0; }
      }, 1000);
      const observed = new WeakSet<Element>();
      const visible = new Set<string>();
      const observer = new IntersectionObserver((entries) => {
        if (document.visibilityState !== "visible") return;
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
          const element = entry.target as HTMLElement;
          const productId = Number(element.dataset.analyticsProduct);
          const position = Number(element.dataset.analyticsPosition);
          const block = element.dataset.analyticsBlock as "hero" | "category" | "products" | undefined;
          const key = productId ? `${productId}:${position}` : block;
          if (!key || visible.has(key)) continue;
          visible.add(key);
          if (productId) trackAnalytics("list_impression", { productId, position });
          if (block) trackAnalytics("block_impression", { block });
        }
      }, { threshold: 0.5 });
      const scan = () => {
        const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="/product/"]')]
          .filter((link) => link.getClientRects().length > 0 && !link.closest("[hidden]"));
        links.forEach((link, index) => {
          const match = link.getAttribute("href")?.match(/^\/product\/(\d+)$/);
          if (match) { link.dataset.analyticsProduct = match[1]; link.dataset.analyticsPosition = String(index + 1); }
        });
        document.querySelectorAll("[data-analytics-product],[data-analytics-block]").forEach((el) => { if (!observed.has(el)) { observed.add(el); observer.observe(el); } });
      };
      scan();
      const mutation = new MutationObserver(scan); mutation.observe(document.body, { childList: true, subtree: true });
      const click = (e: MouseEvent) => {
        const target = e.target instanceof Element ? e.target : null;
        // Favorites/buttons inside a product card are not navigation clicks.
        if (target?.closest("button")) return;
        const link = target?.closest<HTMLElement>("[data-analytics-product]");
        if (link) trackAnalytics("product_click", { productId: Number(link.dataset.analyticsProduct), position: Number(link.dataset.analyticsPosition) });
        const block = target?.closest<HTMLElement>("[data-analytics-block]")?.dataset.analyticsBlock as "hero" | "category" | "products" | undefined;
        if (block && target?.closest("a")) trackAnalytics("block_click", { block });
      };
      const hide = () => { if (document.visibilityState === "hidden") void flushAnalytics(); };
      const pagehide = () => { void flushAnalytics(); };
      document.addEventListener("click", click); document.addEventListener("visibilitychange", hide);
      window.addEventListener("pagehide", pagehide);
      window.addEventListener("pointerdown", activity, { passive: true }); window.addEventListener("keydown", activity); window.addEventListener("scroll", activity, { passive: true });
      cleanup = () => {
        clearInterval(tick); observer.disconnect(); mutation.disconnect();
        document.removeEventListener("click", click); document.removeEventListener("visibilitychange", hide);
        window.removeEventListener("pagehide", pagehide);
        window.removeEventListener("pointerdown", activity); window.removeEventListener("keydown", activity); window.removeEventListener("scroll", activity);
      };
    };
    const storage = (e: StorageEvent) => { if (!e.key || e.key === COOKIE_CONSENT_STORAGE_KEY) { document.documentElement.dataset.consentAnalytics = String(parseCookieConsent(safeStorageGet("local", COOKIE_CONSENT_STORAGE_KEY))?.analytics === true); sync(); } };
    sync(); window.addEventListener("prestigeso:consent-changed", sync); window.addEventListener("storage", storage);
    return () => { cleanup(); window.removeEventListener("prestigeso:consent-changed", sync); window.removeEventListener("storage", storage); };
  }, [pathname, category]);
  return null;
}
