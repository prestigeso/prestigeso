"use client";

import { useCartStore } from "@/store/useCartStore";
import Image from "next/image";

export default function CartDrawer() {
  const { cart, removeFromCart, totalPrice } = useCartStore();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Üst Başlık */}
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Sepetim</h2>
        <p className="text-xs text-gray-500 font-medium">{cart.length} Ürün Bulunuyor</p>
      </div>

      {/* Ürün Listesi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10">
            <span className="text-5xl mb-4">🛒</span>
            <p className="text-gray-400 font-medium">Sepetin şu an boş. Alışverişe başla!</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
              <div className="relative w-16 h-16 bg-white rounded-xl overflow-hidden border border-gray-200">
                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                <p className="text-xs text-gray-500">{item.quantity} Adet</p>
                <p className="text-sm font-black text-black">{item.price * item.quantity} ₺</p>
              </div>
              <button 
                onClick={() => removeFromCart(item.id)}
                className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* Alt Toplam ve Ödeme Butonu */}
      {cart.length > 0 && (
        <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Toplam Tutar</span>
            <span className="text-2xl font-black text-black">{totalPrice()} ₺</span>
          </div>
          <button className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 shadow-xl">
            Siparişi Tamamla 🚀
          </button>
        </div>
      )}
    </div>
  );
}