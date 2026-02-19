"use client";

import { useCart } from "@/context/CartContext";

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, cartTotal } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-2xl font-black text-gray-900">Sepetim ({cart.length})</h2>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 font-medium">Sepetiniz şu an boş.</div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-4 items-center">
                <img src={item.image} alt={item.name} className="w-20 h-24 object-cover rounded-xl bg-gray-100" />
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{item.name}</h3>
                  <p className="text-blue-600 font-black mt-1">{item.price.toLocaleString('tr-TR')} ₺</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-xs font-bold text-red-500 mt-2">Kaldır</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}