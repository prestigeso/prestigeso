"use client";
export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearch } from "@/context/SearchContext";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const { searchQuery, selectedCategory, setSelectedCategory } = useSearch();
  const router = useRouter();
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showAll, setShowAll] = useState(false);
  const [localCampaign, setLocalCampaign] = useState("");

  const baseCategories = ["Masa Süsleri", "Yüzükler", "Setler", "Bilezikler", "Küpeler"];

  // -----------------------------------------------------
  // KUSURSUZ ZİYARETÇİ SAYAÇ VE VERİ MOTORU
  // -----------------------------------------------------
  useEffect(() => {
    setLocalCampaign(localStorage.getItem("prestigeso_campaign") || "");

    const loadAllDataAndCount = async () => {
      // 1. ADIM: ZİYARETÇİ SAYACI (Sekme Kapanana Kadar Sadece 1 Kere Çalışır)
      try {
        const isHere = sessionStorage.getItem("prestige_session_active");

        if (!isHere) {
          // İlk giriş! Hemen kapıyı kilitle ki çift tetiklenmesin.
          sessionStorage.setItem("prestige_session_active", "true");

          const { error } = await supabase.from("page_views").insert([
            { created_at: new Date().toISOString() }
          ]);

          if (error) {
            console.error("Ziyaretçi sayılamadı:", error.message);
            sessionStorage.removeItem("prestige_session_active"); // Hata olursa kilidi aç
          } else {
            console.log("Yeni Müşteri Geldi! +1 👁️");
          }
        } else {
          console.log("Müşteri zaten sitede, sayılmadı. ⏳");
        }
      } catch (err) {
        console.error("Sayaç hatası:", err);
      }

      // 2. ADIM: VİTRİN VERİLERİNİ ÇEK (Sinsi kodlar temizlendi)
      try {
        const { data: slidesData } = await supabase.from("hero_slides").select("*").order("created_at", { ascending: false });
        if (slidesData) setHeroSlides(slidesData);

        const { data: productsData } = await supabase.from("products").select("*").order("created_at", { ascending: false });
        if (productsData) setDbProducts(productsData);
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      } finally {
        setLoading(false);
      }
    };

    loadAllDataAndCount();
  }, []);

  // -----------------------------------------------------
  // SLIDER VE FİLTRELEME
  // -----------------------------------------------------
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  const bestsellersFull = useMemo(() => dbProducts.filter((p) => p.is_bestseller).slice(0, 20), [dbProducts]);
  const newArrivalsFull = useMemo(() => dbProducts.slice(0, 15), [dbProducts]);
  const discountedFull = useMemo(() => dbProducts.filter((p) => Number(p.discount_price) > 0), [dbProducts]);

  const filteredProducts = useMemo(() => {
    let result = dbProducts;
    if (selectedCategory === "En Çok Satanlar") result = bestsellersFull;
    else if (selectedCategory === "Yeni Gelenler") result = newArrivalsFull;
    else if (selectedCategory === "İndirimler") result = discountedFull;
    else if (selectedCategory !== "Tümü") {
      result = dbProducts.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery) {
      result = result.filter((product) => (product.name || "").toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [dbProducts, selectedCategory, searchQuery, bestsellersFull, newArrivalsFull, discountedFull]);

  const handleSeeAll = (cat: string) => {
    setSelectedCategory(cat);
    setShowAll(true);
  };

  // -----------------------------------------------------
  // UI GÖRÜNÜMÜ
  // -----------------------------------------------------
  return (
    <div className="min-h-screen bg-white font-sans text-black pb-24">
      {localCampaign && (
        <div className="bg-black text-white text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] py-2.5 overflow-hidden flex items-center w-full">
          <marquee scrollamount="8" className="w-full">
            {Array(15).fill(localCampaign).join(" ✦ ")}
          </marquee>
        </div>
      )}

      {!showAll && (
        <div className="relative w-full h-[60vh] md:h-[75vh] flex items-center justify-center overflow-hidden bg-gray-900 group cursor-pointer" onClick={() => handleSeeAll("Tümü")}>
          {heroSlides.length > 0 ? (
            heroSlides.map((slide, index) => (
              <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20 z-10 transition-colors duration-500 group-hover:from-black/80"></div>
                <img src={slide.image_url} alt="Vitrin" className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-105" />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4 transition-transform duration-500 group-hover:-translate-y-4">
                  <h1 className="text-4xl md:text-7xl font-black text-white mb-4 tracking-tight drop-shadow-2xl uppercase">{slide.title || "Yeni Sezon"}</h1>
                  <p className="text-gray-200 max-w-lg text-sm md:text-lg font-medium drop-shadow-md uppercase tracking-widest">{slide.subtitle || ""}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/50 bg-black"><p>Vitrin Hazırlanıyor...</p></div>
          )}

          <div className="absolute bottom-0 left-0 w-full py-8 md:py-12 z-30 translate-y-full group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out flex items-center justify-center pointer-events-none">
            <span className="text-white text-xs md:text-sm font-black uppercase tracking-[0.4em] flex items-center gap-2 drop-shadow-lg border-b border-white/30 pb-1">
              TÜM ÜRÜNLERİ KEŞFET <span className="text-lg md:text-xl font-light mb-0.5">›</span>
            </span>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {showAll ? (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">{selectedCategory}</h2>
              <button onClick={() => setShowAll(false)} className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-widest border border-gray-200 hover:border-black px-4 py-2 rounded-full transition-all">
                ✕ Vitrine Dön
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <PrestigeCard key={product.id} product={product} />
              ))}
              {filteredProducts.length === 0 && (
                <p className="col-span-full text-center py-20 text-gray-400 font-bold uppercase tracking-widest border border-dashed border-gray-200 rounded-2xl">
                  Bu listeye ait ürün bulunamadı.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-16 animate-in fade-in duration-500">
            <ProductCarousel title="En Çok Satanlar" products={bestsellersFull.slice(0, 5)} badgeLabel="🔥 Çok Satan" onSeeAll={() => handleSeeAll("En Çok Satanlar")} />
            <ProductCarousel title="Yeni Gelenler" products={newArrivalsFull.slice(0, 5)} badgeLabel="Yeni" onSeeAll={() => handleSeeAll("Yeni Gelenler")} />
            <ProductCarousel title="İndirim Fırsatları" products={discountedFull.slice(0, 5)} badgeLabel="İndirimli" onSeeAll={() => handleSeeAll("İndirimler")} />
            
            {baseCategories.map((cat) => {
              const catProducts = dbProducts.filter((p) => p.category === cat).sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0)).slice(0, 5);
              if (catProducts.length === 0) return null;
              return <ProductCarousel key={cat} title={cat} products={catProducts} onSeeAll={() => handleSeeAll(cat)} />;
            })}

            {bestsellersFull.length === 0 && newArrivalsFull.length === 0 && !loading && (
              <p className="text-center text-gray-400 font-bold py-10 uppercase tracking-widest">Mağazada henüz ürün yok.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCarousel({ title, products, badgeLabel, onSeeAll }: { title: string, products: any[], badgeLabel?: string, onSeeAll?: () => void }) {
  if (!products || products.length === 0) return null;
  return (
    <div>
      <div className="flex justify-between items-end mb-6 px-1 border-b border-gray-100 pb-3">
        <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black border-l-4 border-black pl-3 leading-none">{title}</h2>
        {onSeeAll && (
          <button onClick={onSeeAll} className="text-xs font-black text-gray-400 hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors">
            TÜMÜNÜ GÖR <span className="text-lg leading-none mb-0.5">›</span>
          </button>
        )}
      </div>
      <div className="flex overflow-x-auto md:grid md:grid-cols-5 gap-4 md:gap-5 hide-scrollbar pb-4 snap-x pl-1">
        {products.map((p) => (
          <div key={p.id} className="snap-start w-[160px] md:w-auto flex-shrink-0">
            <PrestigeCard product={p} badgeLabel={badgeLabel} />
          </div>
        ))}
      </div>
    </div>
  );
}

function PrestigeCard({ product, badgeLabel }: { product: any, badgeLabel?: string }) {
  const displayImage = product.images?.[0] || product.image || "/logo.jpeg";
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const currentFavs = JSON.parse(localStorage.getItem("prestige_favorites") || "[]");
    const isFav = currentFavs.find((fav: any) => fav.id === product.id);
    setIsFavorite(!!isFav);
  }, [product.id]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Ürünleri favorilemek için lütfen önce asilce giriş yapın! 🛡️");
      return; 
    }

    const currentFavs = JSON.parse(localStorage.getItem("prestige_favorites") || "[]");
    const isExist = currentFavs.find((fav: any) => fav.id === product.id);
    
    if (!isExist) {
      const newFavs = [...currentFavs, product];
      localStorage.setItem("prestige_favorites", JSON.stringify(newFavs));
      setIsFavorite(true);
      alert("Ürün asilce favorilere eklendi! ❤️");
    } else {
      const newFavs = currentFavs.filter((fav: any) => fav.id !== product.id);
      localStorage.setItem("prestige_favorites", JSON.stringify(newFavs));
      setIsFavorite(false);
      alert("Ürün favorilerden çıkarıldı. 💔");
    }
  };

  return (
    <Link href={`/product/${product.id}`} className="group relative block cursor-pointer w-full h-full flex flex-col">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gray-50 relative border border-gray-200">
        <img src={displayImage} alt={product.name} className="h-full w-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700 ease-out" />
        <button onClick={handleFavoriteClick} className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-sm flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-10 group/btn" title="Favorilere Ekle">
          <svg viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isFavorite ? "0" : "2"} className={`w-4 h-4 transition-colors ${isFavorite ? "text-black" : "text-gray-400 group-hover/btn:text-black"}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        {badgeLabel && (
          <div className="absolute bottom-0 w-full bg-black text-white text-[10px] font-black text-center py-1.5 uppercase tracking-[0.2em] z-10">{badgeLabel}</div>
        )}
      </div>
      <div className="mt-3 px-1 flex-1 flex flex-col">
        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-0.5 truncate">{product.category || "PRESTİGESO"}</p>
        <h3 className="text-xs md:text-sm font-bold text-gray-900 line-clamp-2 leading-snug flex-1">{product.name}</h3>
        <div className="flex items-end gap-2 mt-2">
          {Number(product.discount_price) > 0 ? (
            <>
              <p className="text-base md:text-lg font-black text-black tracking-tight">{Number(product.discount_price).toLocaleString("tr-TR")} ₺</p>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 line-through mb-0.5">{Number(product.price).toLocaleString("tr-TR")} ₺</p>
            </>
          ) : (
            <p className="text-base md:text-lg font-black text-black tracking-tight">{Number(product.price).toLocaleString("tr-TR")} ₺</p>
          )}
        </div>
      </div>
    </Link>
  );
}