"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function AdminPanel() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalValue: 0, count: 0 });
  const { campaignText, updateCampaignText } = useCart();
  const [inputText, setInputText] = useState("");

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
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    fetchRealData();
    setInputText(campaignText);
  }, [campaignText]);

  return (
    <div className="min-h-screen bg-white pb-32 font-sans text-black">
      
      {/* HEADER */}
      <div className="px-6 pt-14 pb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yönetim</h1>
          <p className="text-xs text-gray-400 font-medium">PrestigeSO Mobile Admin</p>
        </div>
        <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold">YP</div>
      </div>

      {/* STATS KARTLARI */}
      <div className="px-4 grid grid-cols-2 gap-4">
        <div className="bg-black p-6 rounded-2xl shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mağaza Değeri</p>
          </div>
          <p className="text-2xl font-bold text-white">{stats.totalValue.toLocaleString('tr-TR')} ₺</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mb-4">Aktif Ürün</p>
          <p className="text-4xl font-bold text-blue-600">{stats.count}</p>
        </div>
      </div>

      {/* KAMPANYA AYARI */}
      <div className="px-4 mt-6">
        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-3">📢 Kayan Yazı</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none"
            />
            <button 
              onClick={() => { updateCampaignText(inputText); alert("Güncellendi!"); }}
              className="bg-black text-white px-4 rounded-xl font-bold text-xs"
            >Kaydet</button>
          </div>
        </div>
      </div>

      {/* ÜRÜN LİSTESİ */}
      <div className="px-6 mt-8 mb-4 flex justify-between items-center">
        <h2 className="font-bold text-lg">Ürün Listesi</h2>
        <button onClick={() => window.location.reload()} className="text-[10px] font-bold text-blue-500 border border-blue-100 px-3 py-1 rounded-full">🔄 Verileri Yenile</button>
      </div>

      <div className="px-4 space-y-3">
        {loading ? <p className="text-center py-10 text-gray-400">Yükleniyor...</p> : 
          products.map((p) => (
            <div key={p.id} className="bg-white p-3 rounded-2xl border border-gray-50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <img src={p.image} className="w-12 h-12 rounded-lg object-cover" />
                <div>
                  <h3 className="text-xs font-bold text-gray-800 line-clamp-1 w-40">{p.name}</h3>
                  <p className="text-xs font-bold text-blue-500 mt-1">{p.price.toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
              <button className="text-gray-300 p-2 text-xl">✕</button>
            </div>
          ))
        }
      </div>

      {/* ALT NAVİGASYON */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 p-6 flex justify-around items-end z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          <span className="text-[9px] font-bold">Mağaza</span>
        </Link>
        
        <div className="bg-black text-white w-14 h-14 rounded-full flex items-center justify-center -mt-10 border-4 border-white shadow-xl text-2xl font-light">
          +
        </div>

        <div className="flex flex-col items-center gap-1 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
          <span className="text-[9px] font-bold">Ayarlar</span>
        </div>
      </div>
    </div>
  );
}