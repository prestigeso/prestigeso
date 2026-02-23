"use client";

import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";

export default function CartSidebar() {
  const { isCartOpen, toggleCart, items, removeFromCart, cartTotal } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleWhatsAppOrder = () => {
    const phoneNumber = "905525280105";

    let message = "Merhaba PrestigeSO! 👋\nAşağıdaki ürünleri sipariş etmek istiyorum:\n\n";

    items.forEach((item) => {
      message += `📦 *${item.name}*\n   Adet: ${item.quantity} | Fiyat: ${item.price.toLocaleString("tr-TR")} ₺\n\n`;
    });

    message += `-------------------\n💰 *TOPLAM TUTAR: ${cartTotal.toLocaleString("tr-TR")} ₺*`;

    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (!mounted || !isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={toggleCart} />

      <div className="absolute inset-y-0 right-0 max-w-md w-full flex shadow-2xl">
        <div className="w-full h-full flex flex-col bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900">Alışveriş Sepeti ({items.length})</h2>
            <button
              onClick={toggleCart}
              className="p-2 -mr-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">🛒</div>
                <p className="text-gray-500 font-medium">Sepetiniz şimdilik boş.</p>
                <button onClick={toggleCart} className="text-blue-600 hover:underline text-sm">
                  Alışverişe devam et
                </button>
              </div>
            ) : (
              <ul className="space-y-6">
                {items.map((item) => (
                  <li key={item.id} className="flex py-2">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover object-center" />
                    </div>

                    <div className="ml-4 flex flex-1 flex-col justify-between">
                      <div className="flex justify-between text-base font-bold text-gray-900">
                        <h3 className="line-clamp-2 pr-4">{item.name}</h3>
                        <p className="whitespace-nowrap">{item.price.toLocaleString("tr-TR")} ₺</p>
                      </div>

                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-xs font-bold text-gray-500">Adet: {item.quantity}</span>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          type="button"
                          className="font-medium text-red-500 hover:text-red-700"
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
            <div className="border-t border-gray-100 px-6 py-6 bg-gray-50">
              <div className="flex justify-between text-lg font-bold text-gray-900 mb-4">
                <p>Toplam Tutar</p>
                <p>{cartTotal.toLocaleString("tr-TR")} ₺</p>
              </div>

              <button
                onClick={handleWhatsAppOrder}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-4 text-base font-bold text-white shadow-lg hover:bg-green-700 active:scale-95"
              >
                WhatsApp ile Sipariş Ver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}