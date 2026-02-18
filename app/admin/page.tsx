// app/admin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminPanel() {
  const [products, setProducts] = useState([
    { id: 1, name: "Nike Air Jordan", price: 4500, stock: 12 },
    { id: 2, name: "Sony Kulaklık", price: 12400, stock: 4 },
    { id: 3, name: "RayBan Gözlük", price: 4200, stock: 0 },
  ]);

  const deleteProduct = (id: number) => {
    if (confirm("Bu ürünü silmek istediğine emin misin?")) {
      setProducts(products.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 select-none">
      
      {/* Üst Bar */}
      <div className="bg-white px-6 pt-12 pb-4 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Yönetim</h1>
          <p className="text-xs text-gray-500 font-medium">PrestigeSO Mobile Admin</p>
        </div>
        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">A</div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="bg-black text-white p-5 rounded-2xl shadow-lg">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Günlük Ciro</p>
          <p className="text-2xl font-bold mt-1">14.250 ₺</p>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Bekleyen</p>
          <p className="text-2xl font-bold text-orange-500 mt-1">3 Sipariş</p>
        </div>
      </div>

      {/* Liste */}
      <div className="px-4 mt-2">
        <div className="flex justify-between items-end mb-4">
            <h2 className="text-gray-900 font-bold text-lg">Ürün Listesi</h2>
            <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded-md">{products.length} Adet</span>
        </div>
        
        <div className="space-y-3">
          {products.map((product) => (
            <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-gray-100 active:scale-95 transition-transform">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center text-xl">📦</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-medium text-gray-500">{product.price.toLocaleString()} ₺</span>
                    {product.stock === 0 ? (
                      <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Tükendi</span>
                    ) : (
                      <span className="text-[10px] bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-bold">{product.stock} Stok</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => deleteProduct(product.id)} className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors">
                  X
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-8 right-6">
        <button className="bg-blue-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-transform">
          +
        </button>
      </div>

      <div className="text-center mt-8 pb-4">
        <Link href="/" className="text-gray-400 text-xs font-medium hover:text-black transition-colors">← Mağazaya Dön</Link>
      </div>
    </div>
  );
}