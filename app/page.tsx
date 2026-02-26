"use client";
export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearch } from "@/context/SearchContext";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useSearch() as any;
  const router = useRouter();
  
  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [localCampaign, setLocalCampaign] = useState("");

  const baseCategories = ["Setler", "Masa Süsleri", "Kolyeler", "Yüzükler", "Bilezikler", "Küpeler"];

  useEffect(() => {
    if ((searchQuery && searchQuery.trim() !== "") || (selectedCategory && selectedCategory !== "Tümü")) {
      setShowAll(true);
    } else if (!searchQuery && selectedCategory === "Tümü") {
      setShowAll(false);
    }
  }, [searchQuery, selectedCategory]);

  const handleCloseShowcase = () => {
    setShowAll(false);
    setSelectedCategory("Tümü");
    if (setSearchQuery) setSearchQuery("");
  };

  useEffect(() => {
    setLocalCampaign(localStorage.getItem("prestigeso_campaign") || "");

    const loadAllDataAndCount = async () => {
      try {
        // 1. Vitrin Görsellerini Çek
        const { data: slidesData } = await supabase.from("hero_slides").select("*").order("created_at", { ascending: false });
        if (slidesData) setHeroSlides(slidesData);

        // 2. Ürünleri ve Yorum İstatistiklerini Çek
        const { data: productsData, error: pError } = await supabase
          .from("products")
          .select("*")
          .gt("stock", 0) 
          .order("created_at", { ascending: false });

        const { data: reviewsData } = await supabase.from("reviews").select("product_id, rating").eq("is_approved", true);

        if (productsData && !pError) {
          const productsWithStats = productsData.map(p => {
            const pRevs = reviewsData?.filter(r => r.product_id === p.id) || [];
            const avg = pRevs.length > 0 ? (pRevs.reduce((acc, r) => acc + r.rating, 0) / pRevs.length) : 0;
            return { ...p, ratingAvg: avg, reviewCount: pRevs.length };
          });
          setDbProducts(productsWithStats);
        }
      } catch (err) { console.error("Veri hatası:", err); } finally { setLoading(false); }
    };

    loadAllDataAndCount();
  }, []);

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
    else if (selectedCategory !== "Tümü") result = dbProducts.filter((p) => p.category === selectedCategory);
    
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter((product) => 
        (product.name || "").toLowerCase().includes(query) || 
        (product.category || "").toLowerCase().includes(query)
      );
    }
    return result;
  }, [dbProducts, selectedCategory, searchQuery, bestsellersFull, newArrivalsFull, discountedFull]);

  const handleSeeAll = (cat: string) => { setSelectedCategory(cat); };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-gray-400">YÜKLENİYOR...</div>;

  return (
    <div className="min-h-screen bg-white font-sans text-black pb-24">
      {localCampaign && (
        <div className="bg-black text-white text-[11px] md:text-xs font-bold uppercase tracking-[0.2em] py-2.5 overflow-hidden w-full">
          <marquee scrollamount="8" className="w-full">{Array(15).fill(localCampaign).join(" ✦ ")}</marquee>
        </div>
      )}

      {!showAll && (
        <div className="relative w-full h-[60vh] md:h-[75vh] flex items-center justify-center overflow-hidden bg-gray-900 group cursor-pointer" onClick={() => handleSeeAll("Tümü")}>
          {heroSlides.map((slide, index) => (
            <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20 z-10"></div>
              <img src={slide.image_url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4">
                <h1 className="text-4xl md:text-7xl font-black text-white mb-4 uppercase">{slide.title || "Yeni Sezon"}</h1>
                <p className="text-gray-200 text-sm md:text-lg uppercase tracking-widest">{slide.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {showAll ? (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
              <h2 className="text-2xl font-black uppercase tracking-tight">{searchQuery ? `Arama: "${searchQuery}"` : selectedCategory}</h2>
              <button onClick={handleCloseShowcase} className="text-xs font-bold text-gray-500 hover:text-black uppercase border px-4 py-2 rounded-full">✕ Vitrine Dön</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
              {filteredProducts.map((p) => <PrestigeCard key={p.id} product={p} />)}
            </div>
          </div>
        ) : (
          <div className="space-y-16">
            <ProductCarousel title="En Çok Satanlar" products={bestsellersFull.slice(0, 5)} badgeLabel="🔥 Çok Satan" onSeeAll={() => handleSeeAll("En Çok Satanlar")} />
            <ProductCarousel title="Yeni Gelenler" products={newArrivalsFull.slice(0, 5)} badgeLabel="Yeni" onSeeAll={() => handleSeeAll("Yeni Gelenler")} />
            <ProductCarousel title="İndirimler" products={discountedFull.slice(0, 5)} badgeLabel="İndirim" onSeeAll={() => handleSeeAll("İndirimler")} />
            {baseCategories.map((cat) => {
              const catProducts = dbProducts.filter((p) => p.category === cat).slice(0, 5);
              return catProducts.length > 0 ? <ProductCarousel key={cat} title={cat} products={catProducts} onSeeAll={() => handleSeeAll(cat)} /> : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ALT BİLEŞENLER
function ProductCarousel({ title, products, badgeLabel, onSeeAll }: any) {
  return (
    <div>
      <div className="flex justify-between items-end mb-6 border-b pb-3">
        <h2 className="text-xl font-black uppercase border-l-4 border-black pl-3">{title}</h2>
        {onSeeAll && <button onClick={onSeeAll} className="text-xs font-black text-gray-400 hover:text-black">TÜMÜNÜ GÖR ›</button>}
      </div>
      <div className="flex overflow-x-auto md:grid md:grid-cols-5 gap-4">
        {products.map((p: any) => <div key={p.id} className="min-w-[160px] md:min-w-0"><PrestigeCard product={p} badgeLabel={badgeLabel} /></div>)}
      </div>
    </div>
  );
}

function PrestigeCard({ product, badgeLabel }: { product: any, badgeLabel?: string }) {
  const [isFavorite, setIsFavorite] = useState(false);

  // DEĞİŞKEN TANIMLARI (Burası hatayı çözen kısım)
  const displayImage = product.images?.[0] || product.image || "/logo.jpeg";
  const activePrice = Number(product.discount_price) > 0 ? Number(product.discount_price) : Number(product.price);
  const ratingCount = product.reviewCount || 0;
  const avgRating = product.ratingAvg || 0;

  useEffect(() => {
    const checkIsFav = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("favorites").select("id").eq("user_id", session.user.id).eq("product_id", product.id).single();
        setIsFavorite(!!data);
      }
    };
    checkIsFav();
  }, [product.id]);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); 
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return alert("Favorilemek için giriş yapın! 🛡️");

    if (isFavorite) {
      setIsFavorite(false);
      await supabase.from("favorites").delete().eq("user_id", session.user.id).eq("product_id", product.id);
    } else {
      setIsFavorite(true);
      await supabase.from("favorites").insert([{ user_id: session.user.id, product_id: product.id }]);
    }
  };

  return (
    <Link href={`/product/${product.id}`} className="group relative block border border-gray-100 p-2 rounded-2xl hover:border-black transition-all bg-white shadow-sm">
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-50 relative mb-3">
        <img src={displayImage} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
        <button onClick={handleFavoriteClick} className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full shadow-sm flex items-center justify-center z-10">
          <svg viewBox="0 0 24 24" fill={isFavorite ? "black" : "none"} stroke="black" strokeWidth="1.5" className="w-4 h-4">
            <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        {badgeLabel && <div className="absolute bottom-0 w-full bg-black text-white text-[10px] font-black text-center py-1 uppercase">{badgeLabel}</div>}
      </div>
      
      <div className="px-1 flex-1 flex flex-col">
        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest truncate">{product.category}</p>
        <h3 className="text-xs font-bold text-gray-900 line-clamp-2 h-8">{product.name}</h3>
        
        <div className="flex items-center gap-1 my-1">
          <span className={`text-[10px] ${ratingCount > 0 ? "text-yellow-400" : "text-gray-300"}`}>
            {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}
          </span>
          <span className="text-[9px] font-bold text-gray-400">({ratingCount})</span>
        </div>

        <div className="flex items-center gap-2 mt-auto">
          <p className="text-sm font-black text-black">{activePrice.toLocaleString("tr-TR")} ₺</p>
          {Number(product.discount_price) > 0 && <p className="text-[10px] text-gray-400 line-through">{Number(product.price).toLocaleString("tr-TR")} ₺</p>}
        </div>
      </div>
    </Link>
  );
}