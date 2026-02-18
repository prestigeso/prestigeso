// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ui/ProductCard";
import ProductModal from "@/components/ProductModal";

// Ürün Tipi
type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  category?: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // --- YENİ EKLENEN STATE'LER ---
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("default"); // default, asc, desc
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Verileri Çek (Scrape)
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/scrape', {
          method: 'POST',
          body: JSON.stringify({ url: 'https://prestigeso.com' }),
          headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.success) {
          setProducts(data.products);
        }
      } catch (error) {
        console.error("Hata:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // --- FİLTRELEME MANTIĞI ---
  const filteredProducts = products
    .filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === "asc") return a.price - b.price; // Artan Fiyat
      if (sortOrder === "desc") return b.price - a.price; // Azalan Fiyat
      return 0; // Varsayılan
    });

  // Modal Açma Fonksiyonu
  const openModal = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <Hero />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        
        {/* --- ARAMA VE FİLTRE ÇUBUĞU --- */}
        <div className="bg-white p-4 rounded-2xl shadow-lg mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Arama Kutusu */}
          <div className="relative w-full md:w-96">
            <input 
              type="text" 
              placeholder="Ürün ara... (örn: Bileklik)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          {/* Sıralama Kutusu */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-sm font-bold text-gray-500 whitespace-nowrap">Sırala:</span>
            <select 
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full md:w-48 p-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="default">Önerilen</option>
              <option value="asc">Fiyat: Artan</option>
              <option value="desc">Fiyat: Azalan</option>
            </select>
          </div>
        </div>

        {/* --- ÜRÜN LİSTESİ --- */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-3xl font-black text-center text-gray-900 mb-2">
            Mağaza Koleksiyonu
          </h2>
          <p className="text-center text-gray-500 mb-10">
            {loading ? "Ürünler yükleniyor..." : `${filteredProducts.length} ürün listeleniyor`}
          </p>
          
          {loading ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
               {[1,2,3,4].map(i => <div key={i} className="h-96 bg-gray-100 rounded-2xl animate-pulse"/>)}
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredProducts.map((product) => (
                <div key={product.id} onClick={() => openModal(product)} className="cursor-pointer">
                   {/* ProductCard'a tıklayınca modal açılacak */}
                   <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-xl text-gray-400">Aradığınız kriterlere uygun ürün bulunamadı. 😔</p>
              <button onClick={() => setSearchTerm("")} className="mt-4 text-blue-600 font-bold hover:underline">
                Tüm ürünleri göster
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- MODAL BİLEŞENİ --- */}
      <ProductModal 
        product={selectedProduct} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

    </main>
  );
}