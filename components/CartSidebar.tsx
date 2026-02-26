"use client";

import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // 1. YENİ EKLENDİ: Yönlendirme için

export default function CartSidebar() {
  const { isCartOpen, toggleCart, items, removeFromCart, updateQuantity, cartTotal } = useCart();
  const [mounted, setMounted] = useState(false);
  const router = useRouter(); // 2. YENİ EKLENDİ: Yönlendiriciyi tanımladık

  useEffect(() => setMounted(true), []);

  // 3. YENİ EKLENDİ: Ödeme sayfasına yönlendirme motoru
  const handleGoToCheckout = () => {
    toggleCart(); // Önce sepet menüsünü asilce kapat
    router.push("/checkout"); // Sonra güvenli ödeme sayfasına fırlat
  };

  if (!mounted || !isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={toggleCart} />

      <div className="absolute inset-y-0 right-0 max-w-md w-full flex shadow-2xl">
        <div className="w-full h-full flex flex-col bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Alışveriş Sepeti ({items.length})</h2>
            <button
              onClick={toggleCart}
              className="p-2 -mr-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-4xl border border-gray-100">🛒</div>
                <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Sepetiniz şimdilik boş.</p>
                <button onClick={toggleCart} className="mt-4 bg-black text-white px-8 py-3 rounded-xl font-bold text-[11px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
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
                        <h3 className="line-clamp-2 pr-4 text-xs uppercase text-gray-700 leading-snug">{item.name}</h3>
                        <p className="whitespace-nowrap font-black">{item.price.toLocaleString("tr-TR")} ₺</p>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50 shadow-sm">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white transition-colors font-black text-lg"
                          >
                            −
                          </button>
                          <span className="w-8 h-8 flex items-center justify-center bg-white text-xs font-black text-black border-x border-gray-200">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white transition-colors font-black text-lg"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          type="button"
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
              <div className="flex justify-between items-end mb-4">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Toplam Tutar</p>
                <p className="text-2xl font-black text-black leading-none">{cartTotal.toLocaleString("tr-TR")} ₺</p>
              </div>

              {/* 4. YENİ EKLENDİ: WhatsApp butonu yerine Ödeme Butonu */}
              <button
                onClick={handleGoToCheckout}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-black px-6 py-4 font-black text-white text-[11px] uppercase tracking-widest shadow-lg hover:bg-gray-800 active:scale-95 transition-all"
              >
                Ödemeye Geç 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}