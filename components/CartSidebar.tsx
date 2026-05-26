"use client";

import { useCart } from "@/context/CartContext";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/checkout/checkoutFormatters";
import {
  calculateRemainingForFreeShipping,
  calculateShippingFee,
  DEFAULT_SHIPPING_SETTINGS,
  normalizeShippingSettings,
} from "@/lib/checkout/checkoutShipping";

export default function CartSidebar() {
  const { isCartOpen, toggleCart, items, removeFromCart, updateQuantity, cartTotal } = useCart();

  const [mounted, setMounted] = useState(false);
  const [authOptionsOpen, setAuthOptionsOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);
  const [shippingSettings, setShippingSettings] = useState(DEFAULT_SHIPPING_SETTINGS);

  const router = useRouter();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const loadShippingSettings = async () => {
      try {
        const response = await fetch("/api/site-settings", {
          method: "GET",
          credentials: "include",
        });

        const json = await response.json();
        setShippingSettings(normalizeShippingSettings(json?.shipping));
      } catch (error) {
        console.error("Sepet kargo ayarları yüklenemedi:", error);
      }
    };

    loadShippingSettings();
  }, []);

  useEffect(() => {
    if (!isCartOpen) {
      setAuthOptionsOpen(false);
      setCheckingSession(false);
    }
  }, [isCartOpen]);

  const shippingFee = useMemo(() => {
    return calculateShippingFee(shippingSettings, Number(cartTotal || 0));
  }, [shippingSettings, cartTotal]);

  const remainingForFreeShipping = useMemo(() => {
    return calculateRemainingForFreeShipping(shippingSettings, Number(cartTotal || 0), shippingFee);
  }, [shippingSettings, cartTotal, shippingFee]);

  const cartFinalTotal = useMemo(() => {
    return Math.max(0, Number(cartTotal || 0) + shippingFee);
  }, [cartTotal, shippingFee]);

  const freeShippingProgress = useMemo(() => {
    const threshold = Number(shippingSettings.free_shipping_threshold || 0);
    if (!shippingSettings.shipping_enabled || threshold <= 0) return 0;
    return Math.min(100, Math.max(0, (Number(cartTotal || 0) / threshold) * 100));
  }, [shippingSettings, cartTotal]);

  const closeCartAndGo = (href: string) => {
    setAuthOptionsOpen(false);
    toggleCart();
    router.push(href);
  };

  const handleGoToCheckout = async () => {
    if (checkingSession) return;

    setCheckingSession(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        closeCartAndGo("/checkout");
        return;
      }

      setAuthOptionsOpen(true);
    } finally {
      setCheckingSession(false);
    }
  };

  if (!mounted || !isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={toggleCart} />

      <div className="absolute inset-y-0 right-0 max-w-md w-full flex shadow-2xl">
        <div className="w-full h-full flex flex-col bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">
              Alışveriş Sepeti ({items.length})
            </h2>

            <button
              type="button"
              onClick={toggleCart}
              className="p-2 -mr-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Sepeti kapat"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl border border-gray-100">
                  🛒
                </div>

                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
                  Sepetiniz şimdilik boş.
                </p>

                <button
                  type="button"
                  onClick={toggleCart}
                  className="mt-4 bg-black text-white px-8 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
                >
                  Alışverişe Devam Et
                </button>
              </div>
            ) : (
              <ul className="space-y-6">
                {items.map((item) => (
                  <li key={item.id} className="flex border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover object-center" />
                    </div>

                    <div className="ml-4 flex flex-1 flex-col justify-between">
                      <div className="flex justify-between items-start text-base font-bold text-gray-900">
                        <h3 className="line-clamp-2 pr-4 text-xs uppercase text-gray-700 leading-snug">
                          {item.name}
                        </h3>

                        <p className="whitespace-nowrap font-black">
                          {formatMoney(item.price)} ₺
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 shadow-sm">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white transition-colors font-black text-lg"
                            aria-label="Ürün adedini azalt"
                          >
                            −
                          </button>

                          <span className="w-8 h-8 flex items-center justify-center bg-white text-xs font-black text-black border-x border-gray-200">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white transition-colors font-black text-lg"
                            aria-label="Ürün adedini artır"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="font-black text-[10px] text-gray-400 hover:text-red-600 uppercase tracking-widest underline underline-offset-4 transition-colors"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-6 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center text-xs font-bold text-gray-400">
                  <span>Ara Toplam</span>
                  <span>{formatMoney(cartTotal)} ₺</span>
                </div>

                <div className={`flex justify-between items-center text-xs font-bold ${shippingFee > 0 ? "text-gray-500" : "text-green-600"}`}>
                  <span>Kargo</span>
                  <span>{shippingFee > 0 ? `${formatMoney(shippingFee)} ₺` : "ÜCRETSİZ"}</span>
                </div>

                {remainingForFreeShipping > 0 && (
                  <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">
                        Ücretsiz kargo için {formatMoney(remainingForFreeShipping)} ₺ daha alışveriş yapın.
                      </p>
                    </div>

                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full transition-all duration-300"
                        style={{ width: `${freeShippingProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-end pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    Toplam Tutar
                  </p>

                  <p className="text-2xl font-black text-black leading-none">
                    {formatMoney(cartFinalTotal)} ₺
                  </p>
                </div>
              </div>

              {authOptionsOpen && (
                <div className="mb-4 bg-gray-50 border border-gray-200 rounded-3xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Devam Etmek İçin Seçim Yapın
                    </p>

                    <p className="text-xs font-bold text-gray-600 leading-relaxed">
                      Hesabınızla devam edin veya misafir olarak hızlıca ödeme yapın.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => closeCartAndGo("/login?redirect=/checkout")}
                      className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 hover:bg-gray-900 transition-all shadow-md"
                    >
                      Giriş Yap / Üye Ol
                    </button>

                    <button
                      type="button"
                      onClick={() => closeCartAndGo("/checkout?guest=1")}
                      className="w-full bg-white text-gray-700 border border-gray-200 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 active:scale-95 transition-all"
                    >
                      Giriş Yapmadan Devam Et
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoToCheckout}
                disabled={checkingSession}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-4 font-black text-white text-[11px] uppercase tracking-widest shadow-lg hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-60 disabled:active:scale-100"
              >
                {checkingSession ? "Kontrol Ediliyor..." : "Ödemeye Geç 🚀"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
