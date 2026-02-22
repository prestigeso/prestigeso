"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import Link from "next/link"; // Artık ürünler kendi detay sayfasına gidecek
import { useSearch } from "@/context/SearchContext";
import { supabase } from "../lib/supabase"; 

export default function Home() {
  const { searchQuery } = useSearch();
  const [dbProducts, setDbProducts] = useState<any[]>([]); 
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Arama ve Kategori
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const [showAll, setShowAll] = useState(false); // "Tüm Ürünleri Keşfet" state'i
  const [localCampaign, setLocalCampaign] = useState("");

  const categories = ["Tümü", "Masa Süsleri", "Yüzükler", "Setler", "Bilezikler", "Küpeler"];

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLocalCampaign(localStorage.getItem("prestigeso_campaign") || "");
    }

    const fetchData = async () => {
      // 1. Vitrin Resimlerini Çek
      const { data: slidesData } = await supabase.from("hero_slides").select("*").order("created_at", { ascending: false });
      if (slidesData) setHeroSlides(slidesData);

      // 2. Ürünleri Çek
      const { data: productsData } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      if (productsData) setDbProducts(productsData);

      setLoading(false);
    };

    fetchData();
  }, []);

  // 🟢 5 Saniyede Bir Resim Değiştirme Animasyonu
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // Filtrelemeler
  const bestsellers = dbProducts.filter(p => p.is_bestseller);
  const discounted = dbProducts.filter(p => p.discount_price > 0);
  
  // Tüm ürünler listesi için arama ve kategori filtresi
  const filteredProducts = dbProducts.filter((product) => {
    const matchCategory = selectedCategory === "Tümü" || product.category === selectedCategory;
    const matchSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-white font-sans text-black pb-24">
      
      {/* 🟢 KAYAN YAZI BANDI */}
      {localCampaign && (
        <div className="bg-black text-white text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] py-2.5 overflow-hidden flex items-center shadow-md relative z-50">
          <marquee scrollamount="6" className="w-full">{localCampaign}</marquee>
        </div>
      )}

      {/* 🟢 DİNAMİK BÜYÜK RESİM (HERO SLIDER) */}
      <div 
        className="relative w-full h-[60vh] md:h-[75vh] flex items-center justify-center overflow-hidden bg-gray-900 group cursor-pointer"
        onClick={() => setShowAll(true)}
      >
        {heroSlides.length > 0 ? (
          <>
            {heroSlides.map((slide, index) => (
              <div 
                key={slide.id} 
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20 z-10"></div> 
                <img src={slide.image_url} alt="Vitrin" className="w-full h-full object-cover" />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
                  <h1 className="text-4xl md:text-7xl font-black text-white mb-4 tracking-tight drop-shadow-2xl">{slide.title || "Yeni Sezon"}</h1>
                  <p className="text-gray-200 max-w-lg text-sm md:text-lg font-medium drop-shadow-md">{slide.subtitle}</p>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-black">
            <p>Admin panelinden vitrin resmi ekleyin.</p>
          </div>
        )}

        {/* 🟢 HOVER EFEKTİ İLE ÇIKAN YAZI */}
        <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 backdrop-blur-sm">
          <span className="text-white text-2xl md:text-4xl font-black uppercase tracking-widest translate-y-8 group-hover:translate-y-0 transition-transform duration-500">
            Tüm Ürünleri Keşfet
          </span>
        </div>
      </div>

      <div className="container mx-auto px-6 lg:px-12 py-12">
        
        {/* KATEGORİ BARI */}
        <div className="flex overflow-x-auto gap-3 mb-10 py-2 hide-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setShowAll(true); }}
              className={`px-6 py-2.5 rounded-full font-bold text-sm whitespace-nowrap transition-all shadow-sm ${selectedCategory === cat ? "bg-black text-white scale-105" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-900"}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 🟢 İÇERİK YÖNETİMİ (TÜMÜ AÇIK / KAPALI) */}
        {showAll ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-black">{selectedCategory === "Tümü" ? "Tüm Ürünler" : selectedCategory}</h2>
              <button onClick={() => setShowAll(false)} className="text-xs font-bold text-gray-500 hover:text-black border border-gray-200 px-4 py-2 rounded-full">✕ Vitrine Dön</button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
              {filteredProducts.length === 0 && <p className="col-span-full text-center py-10 text-gray-400">Bu kategori/aramada ürün bulunamadı.</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-16 animate-in fade-in duration-500">
            
            {/* 🔥 EN ÇOK SATANLAR VİTRİNİ */}
            {bestsellers.length > 0 && (
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 mb-6">🔥 En Çok Satanlar</h2>
                <div className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-4 snap-x">
                  {bestsellers.map(product => (
                    <div key={product.id} className="min-w-[160px] md:min-w-[240px] snap-start">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 📉 İNDİRİM FIRSATLARI VİTRİNİ */}
            {discounted.length > 0 && (
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 mb-6 text-red-600">📉 İndirim Fırsatları</h2>
                <div className="flex gap-4 md:gap-6 overflow-x-auto hide-scrollbar pb-4 snap-x">
                  {discounted.map(product => (
                    <div key={product.id} className="min-w-[160px] md:min-w-[240px] snap-start">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {bestsellers.length === 0 && discounted.length === 0 && !loading && (
               <p className="text-center text-gray-400 font-medium py-10 border border-dashed border-gray-200 rounded-3xl">Ana vitrin ürünleri henüz belirlenmedi. Lütfen Admin panelinden ürünlere "Çok Satan" veya "İndirimli Fiyat" ekleyin.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 🟢 Tıklanınca Yeni Ürün Detay Sayfasına Götüren Özel Kart Bileşeni
function ProductCard({ product }: { product: any }) {
  return (
    <Link href={`/product/${product.id}`} className="group relative block cursor-pointer">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gray-100 relative border border-gray-100">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
        
        {/* İndirim Rozeti */}
        {product.discount_price > 0 && (
          <div className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded shadow-md tracking-wider">
            İNDİRİM
          </div>
        )}

        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="mt-3">
        <h3 className="text-xs md:text-sm font-bold text-gray-900 line-clamp-1">{product.name}</h3>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm font-black text-blue-600">{product.price} ₺</p>
          {product.discount_price > 0 && (
            <p className="text-[10px] font-bold text-gray-400 line-through">{product.discount_price} ₺</p>
          )}
        </div>
      </div>
    </Link>
  );
}