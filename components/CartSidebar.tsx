// components/CartSidebar.tsx
"use client";

import { useCart } from "@/context/CartContext";
import { useEffect, useState } from "react";

export default function CartSidebar() {
  const { isCartOpen, toggleCart, items, removeFromCart, cartTotal } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // --- WHATSAPP SİPARİŞ FONKSİYONU ---
  const handleWhatsAppOrder = () => {
    // 1. ADIM: Arkadaşının telefon numarasını buraya yaz (Başında + olmadan 90 ile başlasın)
    const phoneNumber = "905525280105"; 

    // 2. ADIM: Mesajı oluşturuyoruz
    let message = "Merhaba PrestigeSO! 👋\nAşağıdaki ürünleri sipariş etmek istiyorum:\n\n";

    items.forEach((item) => {
      message += `📦 *${item.name}*\n   Adet: ${item.quantity} | Fiyat: ${item.price.toLocaleString('tr-TR')} ₺\n\n`;
    });

    message += `-------------------\n💰 *TOPLAM TUTAR: ${cartTotal.toLocaleString('tr-TR')} ₺*`;

    // 3. ADIM: WhatsApp linkini oluştur ve yeni sekmede aç
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (!mounted || !isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={toggleCart}
      />

      <div className="absolute inset-y-0 right-0 max-w-md w-full flex shadow-2xl animate-slide-in">
        <div className="w-full h-full flex flex-col bg-white">
          
          {/* Başlık */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900">Alışveriş Sepeti ({items.length})</h2>
            <button 
              onClick={toggleCart} 
              className="p-2 -mr-2 text-gray-400 hover:text-red-500 transition-colors rounded-full hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                    </svg>
                </div>
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
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="h-full w-full object-cover object-center"
                      />
                    </div>

                    <div className="ml-4 flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex justify-between text-base font-bold text-gray-900">
                          <h3 className="line-clamp-2 pr-4">{item.name}</h3>
                          <p className="whitespace-nowrap">{item.price.toLocaleString('tr-TR')} ₺</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm mt-2">
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                            <span className="text-xs font-bold text-gray-500 px-2">Adet: {item.quantity}</span>
                        </div>
                        
                        <button 
                          onClick={() => removeFromCart(item.id)} 
                          type="button" 
                          className="font-medium text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
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

          {/* Alt Toplam ve WhatsApp Butonu */}
          {items.length > 0 && (
            <div className="border-t border-gray-100 px-6 py-6 bg-gray-50">
              <div className="flex justify-between text-lg font-bold text-gray-900 mb-4">
                <p>Toplam Tutar</p>
                <p>{cartTotal.toLocaleString('tr-TR')} ₺</p>
              </div>
              
              <button 
                onClick={handleWhatsAppOrder} // Fonksiyonu buraya bağladık
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-transparent bg-green-600 px-6 py-4 text-base font-bold text-white shadow-lg hover:bg-green-700 transition-all active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                WhatsApp ile Sipariş Ver
              </button>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}