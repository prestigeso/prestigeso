"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminPanel() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalValue: 0, count: 0 });

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          body: JSON.stringify({ url: 'https://prestigeso.com' }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        if (data.success) {
          setProducts(data.products);
          const total = data.products.reduce((acc: number, item: any) => acc + item.price, 0);
          setStats({ totalValue: total, count: data.products.length });
        }
      } catch (error) {
        console.error("Veri çekilemedi", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-24 select-none font-sans text-black">
      {/* HEADER */}
      <div className="bg-white px-6 pt-14 pb-4 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Yönetim</h1>
          <p className="text-xs text-gray-500 font-medium">PrestigeSO Mobile Admin</p>
        </div>
        <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold shadow-lg">YP</div>
      </div>

      {/* STATS KARTLARI */}
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="bg-black text-white p-5 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Mağaza Değeri</p>
          </div>
          <p className="text-xl font-bold">
            {loading ? "..." : `${stats.totalValue.toLocaleString('tr-TR')} ₺`}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Aktif Ürün</p>
          <p className="text-3xl font-black text-blue-600 mt-1">
             {loading ? "..." : stats.count}
          </p>
        </div>
      </div>

      <div className="px-5 mt-4 flex justify-between items-end border-b border-gray-50 pb-4">
        <h2 className="text-gray-900 font-bold text-lg">Ürün Listesi</h2>
        <button onClick={() => window.location.reload()} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">🔄 Verileri Yenile</button>
      </div>
      
      {/* ÜRÜN LİSTESİ */}
      <div className="px-4 mt-3 space-y-3">
        {loading ? (
          [1,2,3,4].map(i => (
            <div key={i} className="bg-white h-20 rounded-xl animate-pulse shadow-sm border border-gray-100"/>
          ))
        ) : (
          products.map((product) => (
            <div key={product.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                    <img src={product.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1 w-40">{product.name}</h3>
                  <span className="text-xs font-medium text-gray-500 mt-1">{product.price.toLocaleString('tr-TR')} ₺</span>
                </div>
              </div>
              <button className="text-gray-300 p-2 text-xl font-light">✕</button>
            </div>
          ))
        )}
      </div>

      {/* ALT NAVİGASYON */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center z-30 pb-safe">
        <Link href="/" className="flex flex-col items-center gap-1 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <span className="text-[10px] font-bold">Mağaza</span>
        </Link>
        <button className="bg-black text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center -mt-8 border-4 border-white text-3xl font-light">+</button>
        <div className="flex flex-col items-center gap-1 text-blue-600">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            <span className="text-[10px] font-bold underline underline-offset-4">Panel</span>
        </div>
      </div>
    </div>
  );
}