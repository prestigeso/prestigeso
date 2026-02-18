// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext"; // Context bağlantısı

export default function AdminPanel() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalValue: 0, count: 0 });
  
  // Kampanya Yazısı İçin Gerekli Olanlar
  const { campaignText, updateCampaignText } = useCart();
  const [inputText, setInputText] = useState("");

  // 1. ADIM: Sayfa açılınca GERÇEK verileri çek
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          body: JSON.stringify({ url: 'https://prestigeso.com' }), // Arkadaşının sitesi
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        
        if (data.success) {
          setProducts(data.products);
          
          // İstatistik Hesapla
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

  // Kampanya yazısını Context'ten alıp kutuya koy
  useEffect(() => {
    setInputText(campaignText);
  }, [campaignText]);

  // Kampanya Kaydetme Fonksiyonu
  const handleSaveCampaign = () => {
    updateCampaignText(inputText);
    alert("Kayan yazı başarıyla güncellendi! 🎉");
  };

  // Ürün Silme Fonksiyonu (Demo)
  const handleDelete = (id: number) => {
    if (window.confirm("Bu ürünü panelden kaldırmak istiyor musun?")) {
      const newProducts = products.filter(p => p.id !== id);
      setProducts(newProducts);
      // İstatistikleri güncelle
      const total = newProducts.reduce((acc: number, item: any) => acc + item.price, 0);
      setStats({ totalValue: total, count: newProducts.length });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 select-none font-sans">
      
      {/* --- ÜST BAR (APP Header) --- */}
      <div className="bg-white px-6 pt-14 pb-4 shadow-sm sticky top-0 z-20 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Yönetim</h1>
          <p className="text-xs text-gray-500 font-medium">PrestigeSO Mobile Admin</p>
        </div>
        {/* Profil İkonu */}
        <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold shadow-lg">
            YP
        </div>
      </div>

      {/* --- DASHBOARD KARTLARI --- */}
      <div className="grid grid-cols-2 gap-4 p-4">
        {/* Kart 1: Toplam Değer */}
        <div className="bg-black text-white p-5 rounded-2xl shadow-xl hover:scale-[1.02] transition-transform">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"/>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Mağaza Değeri</p>
          </div>
          <p className="text-xl font-bold">
            {loading ? "..." : `${stats.totalValue.toLocaleString('tr-TR')} ₺`}
          </p>
        </div>

        {/* Kart 2: Ürün Sayısı */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Aktif Ürün</p>
          <p className="text-3xl font-black text-blue-600 mt-1">
             {loading ? "..." : stats.count}
          </p>
        </div>
      </div>

      {/* --- YENİ: KAMPANYA DÜZENLEME KUTUSU --- */}
      <div className="px-4 mt-2 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
          <h2 className="text-gray-900 font-bold text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
            📢 Kayan Yazı Ayarı
          </h2>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-gray-50"
              placeholder="Örn: %50 İndirim Başladı..."
            />
            <button 
              onClick={handleSaveCampaign}
              className="bg-orange-500 text-white px-4 rounded-xl font-bold text-xs hover:bg-orange-600 transition-colors whitespace-nowrap shadow-md active:scale-95"
            >
              Kaydet
            </button>
          </div>
        </div>
      </div>

      {/* --- LİSTE BAŞLIĞI VE YENİLEME BUTONU --- */}
      <div className="px-5 mt-4 flex justify-between items-end">
        <h2 className="text-gray-900 font-bold text-lg">Ürün Listesi</h2>
        <button 
            onClick={() => window.location.reload()} 
            className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
        >
            🔄 Verileri Yenile
        </button>
      </div>
      
      {/* --- ÜRÜN LİSTESİ --- */}
      <div className="px-4 mt-3 space-y-3">
        {loading ? (
          // Yükleniyor İskeleti (Skeleton)
          [1,2,3,4].map(i => (
            <div key={i} className="bg-white h-20 rounded-xl animate-pulse shadow-sm"/>
          ))
        ) : (
          products.map((product) => (
            <div key={product.id} className="group bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-95 transition-all duration-200">
              
              <div className="flex items-center gap-4">
                {/* Ürün Resmi */}
                <div className="w-14 h-14 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 relative">
                    <img src={product.image} alt="" className="w-full h-full object-cover" />
                </div>
                
                {/* Ürün Bilgisi */}
                <div className="flex flex-col">
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1 w-40">{product.name}</h3>
                  <span className="text-xs font-medium text-gray-500 mt-1">
                    {product.price.toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>
              
              {/* Aksiyon Butonları */}
              <div className="flex items-center gap-2">
                 <button 
                    onClick={() => handleDelete(product.id)}
                    className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                 </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* --- ALT MENÜ (MOBİL NAVİGASYON) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center z-30 pb-safe">
        <Link href="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-black">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75