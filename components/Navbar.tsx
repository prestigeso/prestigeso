"use client";

import { useSearch } from "@/context/SearchContext";
import { useCart } from "@/context/CartContext"; // 1. SEPET BEYNİNİ ÇAĞIRDIK

export default function Navbar() {
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useSearch();
  const { cart, setIsCartOpen } = useCart(); // 2. SEPETTEKİ ÜRÜNLERİ VE AÇMA FONKSİYONUNU ALDIK

  // Kategorilerimiz
  const categories = ["Tümü", "Yeni Gelenler", "İndirim", "Aksesuar"];

  // Sepetteki toplam "adet" sayısını hesapla
  const totalItemsInCart = (cart || []).reduce((total, item) => total + item.quantity, 0);

  return (
    <nav className="p-4 bg-white shadow-sm border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-40">
      
      {/* Logo */}
      <div className="font-black text-2xl tracking-widest cursor-pointer">
        PRESTIGE<span className="text-blue-600">SO</span>
      </div>

      {/* Arama Çubuğu */}
      <div className="relative w-full max-w-md">
        <input 
          type="text" 
          placeholder="Ürün, kategori veya marka ara..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all text-sm font-medium"
        />
        <svg className="w-5 h-5 absolute left-4 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
      </div>

      {/* Sağ Taraf: Kategoriler ve Sepet */}
      <div className="flex items-center gap-6">
        
        {/* Kategoriler */}
        <div className="hidden md:flex gap-4">
          {categories.map(category => (
            <button 
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`font-bold text-sm transition-colors py-1 ${selectedCategory === category ? "text-black border-b-2 border-black" : "text-gray-400 hover:text-black"}`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Sepet İkonu ve Sayacı */}
        <button 
          onClick={() => setIsCartOpen(true)} // Tıklayınca sağdan çekmeceyi açar
          className="relative p-2 text-gray-800 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
          </svg>
          
          {/* Eğer sepette ürün varsa Kırmızı Baloncuğu Göster */}
          {totalItemsInCart > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-in zoom-in">
              {totalItemsInCart}
            </span>
          )}
        </button>

      </div>
    </nav>
  );
}