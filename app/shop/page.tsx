"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useSearch } from "@/context/SearchContext";
import Link from "next/link";

export default function ShopPage() {
  const { searchQuery, selectedCategory, setSelectedCategory } = useSearch();
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = ["Tümü", "Masa Süsleri", "Yüzükler", "Setler", "Bilezikler", "Küpeler"];

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setDbProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return dbProducts.filter((product) => {
      const matchCategory = selectedCategory === "Tümü" || product.category === selectedCategory;
      const matchSearch = (product.name || "").toLowerCase().includes((searchQuery || "").toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [dbProducts, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Üst Başlık ve Filtreler */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-gray-100 pb-8 gap-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter text-black">
            TÜM ÜRÜNLER <span className="text-gray-300 ml-2">[{filteredProducts.length}]</span>
          </h1>
          
          <div className="flex gap-2 overflow-x-auto hide-scrollbar w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border-2 ${
                  selectedCategory === cat 
                    ? "bg-black text-white border-black" 
                    : "bg-white text-gray-400 border-gray-100 hover:border-black hover:text-black"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Ürün Izgarası */}
        {loading ? (
          <div className="py-20 text-center font-bold text-gray-300 uppercase tracking-widest">Koleksiyon Hazırlanıyor...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredProducts.map((product) => (
              <ShopCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopCard({ product }: { product: any }) {
  const displayImage = product.images?.[0] || product.image || "/logo.jpeg";
  return (
    <Link href={`/product/${product.id}`} className="group block">
      <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 relative mb-3">
        <img src={displayImage} alt={product.name} className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-700" />
        {product.is_bestseller && (
          <div className="absolute bottom-0 w-full bg-black text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest">Çok Satan</div>
        )}
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{product.category}</p>
      <h3 className="text-sm font-bold text-black line-clamp-1 mb-1">{product.name}</h3>
      <p className="text-lg font-black text-black">{Number(product.price).toLocaleString("tr-TR")} ₺</p>
    </Link>
  );
}