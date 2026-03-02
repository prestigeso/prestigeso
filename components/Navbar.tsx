"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useSearch();
  const { items, setIsCartOpen } = useCart();
  
  // YENİ: Mobilde soldan açılan menünün hafızası
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const categories = ["Setler", "Masa Süsleri", "Kolyeler", "Yüzükler", "Bilezikler", "Küpeler"];
  const totalItemsInCart = (items || []).reduce((total, item) => total + item.quantity, 0);

  // TRENDYOL MANTIĞI: Oturum kontrolü yapan fonksiyon
  const handleProfileClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push("/profile");
    } else {
      router.push("/login");
    }
  };

  // Mobilde menüden bir kategori seçince menüyü kapatıp anasayfaya yönlendiren motor
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setIsMobileMenuOpen(false);
    router.push("/");
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
        
        {/* ========================================== */}
        {/* MOBİL TASARIM (Sadece Telefondan Girince Görünür) */}
        {/* ========================================== */}
        <div className="md:hidden flex items-center justify-between p-4 relative h-16">
          
          {/* SOL: Hamburger Menü Butonu */}
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-black active:scale-95 transition-transform">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
          </button>

          {/* ORTA: Logomuz (Tam Merkeze Sabitli) */}
          <a href="/" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-2xl tracking-widest cursor-pointer">
            <img src="/logo.jpeg" alt="PrestigeSO" className="h-8 object-contain" />
          </a>

          {/* SAĞ: Profil İkonu */}
          <button onClick={handleProfileClick} className="p-2 -mr-2 text-gray-800 transition-colors active:scale-95">
            <span className="text-[22px]">👤</span>
          </button>
        </div>


        {/* ========================================== */}
        {/* MASAÜSTÜ TASARIM (Sadece Bilgisayardan Girince Görünür) */}
        {/* ========================================== */}
        <div className="hidden md:flex p-4 items-center justify-between gap-4">
          
          {/* Logo */}
          <a href="/" className="font-black text-2xl tracking-widest cursor-pointer">
            <img src="/logo.jpeg" alt="PrestigeSO" className="h-10 object-contain" />
          </a>

          {/* Arama Çubuğu */}
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Ürün, kategori veya marka ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm font-medium"
            />
            <svg className="w-5 h-5 absolute left-4 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
            </svg>
          </div>

          {/* Kategoriler ve Sağ İkonlar */}
          <div className="flex items-center gap-4">
            <div className="flex gap-4 mr-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`font-bold text-sm transition-colors py-1 ${
                    selectedCategory === category ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-black"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <button onClick={handleProfileClick} className="p-2 text-gray-800 hover:text-black hover:bg-gray-100 rounded-full transition-colors" title="Profil">
              👤
            </button>

            <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-gray-800 hover:text-black hover:bg-gray-100 rounded-full transition-colors" title="Sepet">
              🛒
              {totalItemsInCart > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                  {totalItemsInCart}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ========================================== */}
      {/* MOBİL: SOLDAN KAYARAK AÇILAN (DRAWER) MENÜ */}
      {/* ========================================== */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[9999] flex">
          {/* Arka plan karartması (Tıklayınca kapanır) */}
          <div className="fixed inset-0 bg-black/60 transition-opacity backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          
          {/* Sol Menü Paneli */}
          <div className="relative w-[75%] max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            
            {/* Menü Başlığı */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <span className="font-black text-lg tracking-widest uppercase">Kategoriler</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold active:scale-95">✕</button>
            </div>
            
            {/* Kategori Listesi */}
            <div className="flex-1 overflow-y-auto py-2">
              <button onClick={() => handleCategorySelect("Tümü")} className="w-full text-left px-6 py-4 font-black uppercase tracking-widest text-sm border-b border-gray-50 hover:bg-gray-50 transition-colors">
                Tüm Ürünler
              </button>
              <button onClick={() => handleCategorySelect("İndirimler")} className="w-full text-left px-6 py-4 font-black uppercase tracking-widest text-sm text-red-600 border-b border-gray-50 hover:bg-red-50 transition-colors">
                % İndirimler
              </button>
              
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategorySelect(category)}
                  className="w-full text-left px-6 py-4 font-bold text-gray-600 uppercase tracking-widest text-xs border-b border-gray-50 hover:bg-gray-50 transition-colors flex justify-between items-center"
                >
                  {category}
                  <span className="text-gray-300">›</span>
                </button>
              ))}
            </div>

            {/* En Alt Kısmı (Hesabım Butonu) */}
            <div className="p-5 border-t border-gray-100 bg-white mt-auto pb-8">
              <button onClick={() => { setIsMobileMenuOpen(false); handleProfileClick(); }} className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                <span className="text-base">👤</span> Hesabım
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}