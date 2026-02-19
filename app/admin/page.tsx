"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function AdminPanel() {
  // 1. Veri Çekme Stateleri
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalValue: 0, count: 0 });

  // 2. Ayarlar Menüsü ve Kayan Yazı Stateleri (Eski Kodundan)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { campaignText, updateCampaignText } = useCart();
  const [inputText, setInputText] = useState("");

  // 3. YENİ: Ürün Ekleme Modalı Stateleri
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    image: "",
    category: "Yeni Gelenler",
    stock: ""
  });

  // Verileri Çekme
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

  // Menü açıldığında mevcut yazıyı kutuya doldur
  useEffect(() => {
    setInputText(campaignText || "");
  }, [campaignText]);

  const handleSaveSettings = () => {
    if(updateCampaignText) updateCampaignText(inputText);
    alert("Kayan yazı güncellendi! 🎉");
    setIsSettingsOpen(false);
  };

  // YENİ: Ürün Ekleme Fonksiyonu
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`🎉 "${newProduct.name}" mağazaya eklendi!`);
    setIsAddModalOpen(false);
    setNewProduct({ name: "", price: "", image: "", category: "Yeni Gelenler", stock: "" });
  };

  return (
    <div className="min-h-screen bg-white pb-24 select-none font-sans text-black relative">
      
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
        <button onClick={() => window.location.reload()} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">🔄 Yenile</button>
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
              <button className="text-gray-300 p-2 text-xl font-light hover:text-red-500 transition-colors">✕</button>
            </div>
          ))
        )}
      </div>

      {/* ALT NAVİGASYON */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center z-30 pb-safe">
        <Link href="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-black">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
            <span className="text-[10px] font-bold">Mağaza</span>
        </Link>
        
        {/* YENİ ÜRÜN EKLEME BUTONU (Ortadaki Siyah Buton) */}
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-black text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center -mt-8 border-4 border-white text-3xl font-light active:scale-95 transition-transform"
        >
          +
        </button>
        
        {/* PANEL BUTONU */}
        <button 
            onClick={() => setIsSettingsOpen(true)} 
            className="flex flex-col items-center gap-1 text-blue-600 active:scale-95 transition-transform"
        >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>
            <span className="text-[10px] font-bold underline underline-offset-4">Panel</span>
        </button>
      </div>

      {/* --- 1. GİZLİ AYARLAR PENCERESİ (Kayan Yazı) --- */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-12 shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
              <h2 className="text-xl font-black text-gray-900">Ayarlar / Panel</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full font-bold">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">📢 Kayan Yazı Metni</label>
                <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-black" />
              </div>
              <button onClick={handleSaveSettings} className="w-full bg-black text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 shadow-xl">
                Kaydet ve Yayınla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- 2. ÜRÜN EKLEME MODALI (Yeni Eklenen) --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 pb-12 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-black text-gray-900">✨ Yeni Ürün Ekle</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-500 rounded-full font-bold">✕</button>
            </div>
            
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ürün Adı</label>
                <input required type="text" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Fiyat (₺)</label>
                  <input required type="number" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Stok</label>
                  <input required type="number" value={newProduct.stock} onChange={(e) => setNewProduct({...newProduct, stock: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Kategori</label>
                <select value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none font-medium">
                  <option>Yeni Gelenler</option>
                  <option>İndirim</option>
                  <option>Aksesuar</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest active:scale-95 shadow-xl mt-4">
                Mağazaya Ekle
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}