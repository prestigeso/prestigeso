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
      <div className="px-6 pt-14 pb-6 flex justify-between items-center border-b border-gray-50">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Yönetim</h1>
          <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">PrestigeSO Mobile Admin</p>
        </div>
        <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold shadow-lg">YP</div>
      </div>

      {/* STATS KARTLARI */}
      <div className="px-4 grid grid-cols-2 gap-4 mt-6">
        <div className="bg-black p-6 rounded-3xl shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Mağaza Değeri</p>
          </div>
          <p className="text-xl font-bold text-white tracking-tighter">
            {stats.totalValue.toLocaleString('tr-TR')} ₺
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Aktif Ürün</p>
          <p className="text-3xl font-black text-blue-600 tracking-tighter">{stats.count}</p>
        </div>
      </div>

      {/* KAMPANYA DÜZENLEME ALANI */}
      <div className="px-4 mt-6">
        <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 shadow-inner">
          <h2 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">📢 Kayan Yazıyı Düzenle</h2>
          <div className="flex flex-col gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-3 bg-white border border-gray-200 rounded-2xl text-xs focus:ring-1 focus:ring-black outline-none transition-all"
            />
            <button 
              onClick={() => { updateCampaignText(inputText); alert("Sistem güncellendi! 🚀"); }}
              className="w-full bg-black text-white py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
            >Kaydet</button>
          </div>
        </div>
      </div>

      {/* ÜRÜN LİSTESİ */}
      <div className="px-6 mt-8 mb-4 flex justify-between items-center">
        <h2 className="font-black text-lg tracking-tight italic">Ürün Listesi</h2>
        <button onClick={() => window.location.reload()} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase">Yenile</button>
      </div>

      <div className="px-4 space-y-2">
        {loading ? <p className="text-center py-10 text-gray-300 font-bold italic uppercase text-[10px]">Veriler Yükleniyor...</p> : 
          products.map((p) => (
            <div key={p.id} className="bg-white p-3 rounded-2xl border border-gray-50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <img src={p.image} className="w-12 h-12 rounded-xl object-cover" />
                <div>
                  <h3 className="text-[10px] font-bold text-gray-800 line-clamp-1 w-40 uppercase tracking-tight">{p.name}</h3>
                  <p className="text-xs font-black text-blue-500 mt-1">{p.price.toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
              <button className="text-gray-300 p-2">✕</button>
            </div>
          ))
        }
      </div>

      {/* SABİT ALT NAVİGASYON */}
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-6 flex justify-around items-end z-50">
        <Link href="/" className="flex flex-col items-center gap-1 text-gray-300">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
          <span className="text-[8px] font-black uppercase">Mağaza</span>
        </Link>
        
        <div className="bg-black text-white w-14 h-14 rounded-full flex items-center justify-center -mt-10 border-[5px] border-white shadow-2xl shadow-black/30">
          <span className="text-xl font-light">+</span>
        </div>

        <div className="flex flex-col items-center gap-1 text-blue-600">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
          <span className="text-[8px] font-black uppercase underline underline-offset-4">Panel</span>
        </div>
      </div>
    </div>
  );
}