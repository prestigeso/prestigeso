"use client";

import { useRouter } from "next/navigation";
import { useSearch } from "@/context/SearchContext";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const router = useRouter();
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useSearch();
  const { items, setIsCartOpen } = useCart();

  const categories = ["Tümü", "Masa Süsleri", "Yüzükler", "Setler", "Bilezikler", "Küpeler"];
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

  return (
    <nav className="p-4 bg-white shadow-sm border-b border-gray-100 flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-40">
      
      {/* Logo: Hard reset için <a> kullanıldı */}
      <a href="/" className="font-black text-2xl tracking-widest cursor-pointer">
        <img src="/logo.jpeg" alt="PrestigeSO" className="h-9 md:h-10 object-contain" />
      </a>

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

      <div className="flex items-center gap-4">
        <div className="hidden md:flex gap-4">
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

        {/* Profil: Akıllı yönlendirme butonu */}
        <button
          onClick={handleProfileClick}
          className="p-2 text-gray-800 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
          title="Profil"
        >
          👤
        </button>

        {/* Sepet */}
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 text-gray-800 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
          title="Sepet"
        >
          🛒
          {totalItemsInCart > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
              {totalItemsInCart}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
}