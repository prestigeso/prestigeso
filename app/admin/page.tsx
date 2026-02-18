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
    <div className="min-h-screen bg-[#FDFDFD] pb-32 font-sans text-black select-none">
      
      {/* ÜST BAŞLIK */}
      <div className="bg-white px-6 pt-14 pb-6 flex justify-between items-end border-b border-gray-50">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 uppercase">Yönetim</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">PrestigeSO Mobile Admin</p>
        </div>
        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-bold shadow-xl rotate-3">YP</div>
      </div>

      {/* KARTLAR */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="bg-black p-6 rounded-[2.5rem] shadow-2xl">
          <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Mağaza Değeri</p>
          <p className="text-2xl font-bold text-white tracking-tight">{stats.totalValue.toLocaleString('tr-TR')} ₺</p>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-between">
          <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">Aktif Ürün</p>
          <p className="text-4xl font-black text-blue-600 tracking-tighter">{stats.count}</p>
        </div>
      </div>

      {/* KAYAN YAZI AYARI */}
      <div className="px-4 mb-8">
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 italic">📢 Kayan Yazıyı Düzenle</h2>
          <div className="flex flex-col gap-3">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl text-sm border-none focus:ring-2 focus:ring-black transition-all"
            />
            <button 
              onClick={() => { updateCampaignText(inputText); alert("Başarıyla Güncellendi! 🚀"); }}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform shadow-lg"
            >
              YAYINLA
            </button>
          </div>
        </div>
      </div>

      {/* ENVANTER BAŞLIĞI */}
      <div className="px-6 mb-4 flex justify-between items-center">
        <h2 className="font-black text-xl tracking-tight text-gray-900 italic">Envanter</h2>
        <button onClick={() => window.location.reload()} className="text-[10px] font-bold text-blue-500 bg-blue-50 px-3 py-1 rounded-full">Yenile</button>
      </div>

      {/* ÜRÜN LİSTESİ */}
      <div className="px-4 space-y-3">
        {loading ? <p className="text-center py-10 text-gray-300 font-bold italic uppercase">Veriler Çekiliyor...</p> : 
          products.map((p) => (
            <div key={p.id} className="bg-white p-4 rounded-3xl border border-gray-50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <img src={p.image} className="w-14 h-14 rounded-2xl object-cover shadow-sm" />
                <div>
                  <h3 className="text-[11px] font-bold text-gray-800 line-clamp-1 w-32 uppercase">{p.name}</h3>
                  <p className="text-sm font-black text-blue-600 mt-1">{p.price.toLocaleString('tr-TR')} ₺</p>
                </div>
              </div>
              <button className="text-red-300 p-2">✕</button>
            </div>
          ))
        }
      </div>

      {/* SABİT ALT NAVİGASYON */}
      <div className="fixed bottom-0 inset-x-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-6 flex justify-around items-center z-50">
        <Link href="/" className="text-[10px] font-black uppercase text-gray-300">Önizleme</Link>
        <div className="bg-black text-white w-14 h-14 rounded-full flex items-center justify-center -mt-12 border-[6px] border-[#FDFDFD] shadow-2xl">
          <span className="text-xl">+</span>
        </div>
        <span className="text-[10px] font-black uppercase text-black underline underline-offset-8">Panel</span>
      </div>

    </div>
  );
}