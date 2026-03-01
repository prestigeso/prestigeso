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
  const [dbCampaigns, setDbCampaigns] = useState<any[]>([]); // YENİ: KAMPANYA HAFIZASI
  const [heroSlides, setHeroSlides] = useState<any[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [localCampaign, setLocalCampaign] = useState("");

  const baseCategories = ["Setler", "Masa Süsleri", "Kolyeler", "Yüzükler", "Bilezikler", "Küpeler"];

  useEffect(() => {
    if ((searchQuery && searchQuery.trim() !== "") || (selectedCategory && selectedCategory !== "Tümü")) {
      setShowAll(true);
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
      // ZİYARETÇİ SAYAÇ MOTORU
      try {
        const isHere = sessionStorage.getItem("prestige_session_active");
        if (!isHere) {
          sessionStorage.setItem("prestige_session_active", "true");
          await supabase.from("page_views").insert([{ created_at: new Date().toISOString() }]);
        }
      } catch (err) {}

      try {
        // 1. Vitrin Görsellerini Çek
        const { data: slidesData } = await supabase.from("hero_slides").select("*").order("created_at", { ascending: false });
        if (slidesData) setHeroSlides(slidesData);

        // 2. Aktif Kampanyaları Çek
        const { data: campData } = await supabase.from("campaigns").select("*");
        if (campData) setDbCampaigns(campData);

        // 3. Ürünleri ve Yorum İstatistiklerini Çek
        const { data: productsData, error: pError } = await supabase.from("products").select("*").gt("stock", 0).order("created_at", { ascending: false });
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
    const interval = setInterval(() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length), 5000);
    return () => clearInterval(interval);
  }, [heroSlides.length]);

  // YENİ NESİL KAMPANYA FİLTRELEME MOTORU (Çelik Yelekli)
  const nowIso = new Date().toISOString();
  
  const discountedFull = useMemo(() => {
    return dbProducts.filter((p) => {
      return dbCampaigns.find(c => {
        const ids = Array.isArray(c.product_ids) ? c.product_ids : (typeof c.product_ids === 'string' ? JSON.parse(c.product_ids || "[]") : []);
        return ids.includes(p.id) && nowIso >= c.start_date && nowIso <= c.end_date;
      });
    });
  }, [dbProducts, dbCampaigns, nowIso]);

  const bestsellersFull = useMemo(() => dbProducts.filter((p) => p.is_bestseller).slice(0, 20), [dbProducts]);
  const newArrivalsFull = useMemo(() => dbProducts.slice(0, 15), [dbProducts]);

  const filteredProducts = useMemo(() => {
    let result = dbProducts;
    if (selectedCategory === "En Çok Satanlar") result = bestsellersFull;
    else if (selectedCategory === "Yeni Gelenler") result = newArrivalsFull;
    else if (selectedCategory === "İndirimler") result = discountedFull;
    else if (selectedCategory !== "Tümü") result = dbProducts.filter((p) => p.category === selectedCategory);
    
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      result = result.filter((product) => (product.name || "").toLowerCase().includes(query) || (product.category || "").toLowerCase().includes(query));
    }
    return result;
  }, [dbProducts, selectedCategory, searchQuery, bestsellersFull, newArrivalsFull, discountedFull]);

  const handleSeeAll = (cat: string) => { 
    setSelectedCategory(cat);
    setShowAll(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-gray-400 uppercase tracking-widest bg-white">Vitrin Hazırlanıyor...</div>;

  return (
    <div className="min-h-screen bg-white font-sans text-black pb-20 md:pb-24">
      {/* 1. ÜST KAYAN YAZI */}
      {localCampaign && (
        <div className="bg-black text-white text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] py-2.5 overflow-hidden w-full sticky top-0 z-50">
          <marquee scrollamount="6" className="w-full">{Array(15).fill(localCampaign).join(" ✦ ")}</marquee>
        </div>
      )}

      {/* MOBİL ÖZEL: YATAY KATEGORİ BALONLARI (CHIPS) */}
      <div className="md:hidden flex overflow-x-auto gap-2 px-4 py-3 hide-scrollbar bg-white/90 backdrop-blur-sm sticky top-9 z-40 border-b border-gray-100 shadow-sm">
        <button onClick={() => handleSeeAll("Tümü")} className={`flex-shrink-0 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === "Tümü" && showAll ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200"}`}>Tümü</button>
        <button onClick={() => handleSeeAll("İndirimler")} className={`flex-shrink-0 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === "İndirimler" ? "bg-red-500 text-white border-red-500" : "bg-white text-red-500 border-red-200"}`}>% İndirim</button>
        {baseCategories.map(cat => (
          <button key={cat} onClick={() => handleSeeAll(cat)} className={`flex-shrink-0 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200"}`}>
            {cat}
          </button>
        ))}
      </div>

      {/* 2. HERO SLIDER (Mobil için biraz daha kısa, Masaüstü için devasa) */}
      {!showAll && (
        <div className="relative w-full h-[50vh] md:h-[75vh] flex items-center justify-center overflow-hidden bg-gray-900 group cursor-pointer" onClick={() => handleSeeAll("Tümü")}>
          {heroSlides.map((slide, index) => (
            <div key={slide.id} className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10 transition-colors duration-500"></div>
              <img src={slide.image_url} alt="" className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-105" />
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-end md:justify-center pb-16 md:pb-0 text-center px-4">
                <h1 className="text-4xl md:text-7xl font-black text-white mb-2 md:mb-4 uppercase tracking-tight drop-shadow-2xl">{slide.title || "Yeni Sezon"}</h1>
                <p className="text-gray-200 text-xs md:text-lg uppercase tracking-widest drop-shadow-md">{slide.subtitle}</p>
              </div>
            </div>
          ))}
          <div className="absolute bottom-6 md:bottom-12 left-0 w-full z-30 flex items-center justify-center pointer-events-none">
            <span className="text-white text-[9px] md:text-sm font-black uppercase tracking-[0.4em] flex items-center gap-2 drop-shadow-lg border-b border-white/50 pb-1">
              TÜM ÜRÜNLERİ KEŞFET <span className="text-lg md:text-xl font-light mb-0.5">›</span>
            </span>
          </div>
        </div>
      )}

      {/* 3. ANA İÇERİK (ÜRÜNLER) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {showAll ? (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6 md:mb-8 border-b-2 border-black pb-3 md:pb-4">
              <h2 className="text-lg md:text-2xl font-black uppercase tracking-tight truncate pr-4">{searchQuery ? `Arama: "${searchQuery}"` : selectedCategory}</h2>
              <button onClick={handleCloseShowcase} className="text-[10px] md:text-xs font-bold text-gray-500 hover:text-black uppercase border border-gray-200 px-3 md:px-4 py-1.5 md:py-2 rounded-full flex-shrink-0">✕ Geri</button>
            </div>
            
            {filteredProducts.length === 0 ? (
               <div className="text-center py-20"><p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Ürün Bulunamadı.</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-6">
                {filteredProducts.map((p) => <PrestigeCard key={p.id} product={p} campaigns={dbCampaigns} />)}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-10 md:space-y-16">
            <ProductCarousel title="En Çok Satanlar" products={bestsellersFull.slice(0, 5)} campaigns={dbCampaigns} badgeLabel="🔥 Çok Satan" onSeeAll={() => handleSeeAll("En Çok Satanlar")} />
            <ProductCarousel title="Yeni Gelenler" products={newArrivalsFull.slice(0, 5)} campaigns={dbCampaigns} badgeLabel="Yeni" onSeeAll={() => handleSeeAll("Yeni Gelenler")} />
            <ProductCarousel title="İndirimdekiler" products={discountedFull.slice(0, 5)} campaigns={dbCampaigns} badgeLabel="İndirim" onSeeAll={() => handleSeeAll("İndirimler")} />
            
            {/* MOBİL ÖZEL: Araya giren şık bir banner */}
            <div className="md:hidden bg-gray-900 rounded-2xl p-6 text-center shadow-lg my-8 flex flex-col items-center justify-center">
               <span className="text-3xl mb-2">💎</span>
               <h3 className="text-white font-black uppercase tracking-widest text-sm mb-1">Prestige Özel Koleksiyon</h3>
               <p className="text-gray-400 text-[10px] mb-4">En zarif tasarımlar sizin için seçildi.</p>
               <button onClick={() => handleSeeAll("Tümü")} className="bg-white text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Keşfet</button>
            </div>

            {baseCategories.map((cat) => {
              const catProducts = dbProducts.filter((p) => p.category === cat).slice(0, 5);
              return catProducts.length > 0 ? <ProductCarousel key={cat} title={cat} products={catProducts} campaigns={dbCampaigns} onSeeAll={() => handleSeeAll(cat)} /> : null;
            })}
          </div>
        )}
      </div>

      {/* MOBİL ÖZEL: INSTAGRAM / TRENDYOL TARZI BOTTOM NAV (ALT MENÜ) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-gray-200 flex justify-around items-center py-2 px-2 z-[100] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button onClick={() => { setShowAll(false); window.scrollTo(0,0); }} className="flex flex-col items-center p-2 text-black transition-transform active:scale-95">
          <span className="text-xl mb-0.5">🏠</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Vitrin</span>
        </button>
        <button onClick={() => document.getElementById("mobile-search")?.focus()} className="flex flex-col items-center p-2 text-gray-400 hover:text-black transition-transform active:scale-95">
          <span className="text-xl mb-0.5">🔍</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Ara</span>
        </button>
        <Link href="/favorites" className="flex flex-col items-center p-2 text-gray-400 hover:text-red-500 transition-transform active:scale-95">
          <span className="text-xl mb-0.5">❤️</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Favori</span>
        </Link>
        <button onClick={() => router.push('/cart')} className="flex flex-col items-center p-2 text-gray-400 hover:text-black transition-transform active:scale-95 relative">
          <span className="text-xl mb-0.5">🛒</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Sepet</span>
        </button>
        <Link href="/profile" className="flex flex-col items-center p-2 text-gray-400 hover:text-black transition-transform active:scale-95">
          <span className="text-xl mb-0.5">👤</span>
          <span className="text-[8px] font-black uppercase tracking-widest">Hesap</span>
        </Link>
      </div>

    </div>
  );
}

// ALT BİLEŞENLER
function ProductCarousel({ title, products, campaigns, badgeLabel, onSeeAll }: any) {
  if (!products || products.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex justify-between items-end mb-4 md:mb-6 border-b pb-2 md:pb-3 px-1">
        <h2 className="text-base md:text-xl font-black uppercase border-l-4 border-black pl-2 md:pl-3">{title}</h2>
        {onSeeAll && <button onClick={onSeeAll} className="text-[9px] md:text-xs font-black text-gray-400 hover:text-black transition-colors uppercase flex items-center gap-1">TÜMÜ <span className="text-sm">›</span></button>}
      </div>
      {/* Mobilde kaydırmalı, masaüstünde grid */}
      <div className="flex overflow-x-auto md:grid md:grid-cols-5 gap-3 md:gap-4 px-1 hide-scrollbar pb-4 snap-x snap-mandatory">
        {products.map((p: any) => <div key={p.id} className="min-w-[140px] md:min-w-0 w-[45vw] md:w-auto snap-start"><PrestigeCard product={p} campaigns={campaigns} badgeLabel={badgeLabel} /></div>)}
      </div>
    </div>
  );
}

function PrestigeCard({ product, campaigns, badgeLabel }: { product: any, campaigns: any[], badgeLabel?: string }) {
  const [isFavorite, setIsFavorite] = useState(false);

  const displayImage = product.images?.[0] || product.image || "/logo.jpeg";
  const ratingCount = product.reviewCount || 0;
  const avgRating = product.ratingAvg || 0;

  // YENİ NESİL FİYAT HESAPLAMA MOTORU
  const nowIso = new Date().toISOString();
  const activeCamp = campaigns?.find(c => {
    const ids = Array.isArray(c.product_ids) ? c.product_ids : (typeof c.product_ids === 'string' ? JSON.parse(c.product_ids || "[]") : []);
    return ids.includes(product.id) && nowIso >= c.start_date && nowIso <= c.end_date;
  });
  
  let activePrice = Number(product.price);
  if (activeCamp) {
    activePrice = Number(product.price) * (1 - activeCamp.discount_percent / 100);
  }

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
    <Link href={`/product/${product.id}`} className="group relative flex flex-col h-full border border-gray-100 p-2 rounded-2xl hover:border-black transition-all bg-white shadow-sm hover:shadow-md">
      <div className="aspect-[4/5] md:aspect-square w-full overflow-hidden rounded-xl bg-gray-50 relative mb-3">
        <img src={displayImage} alt={product.name} className="h-full w-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700" loading="lazy" />
        <button onClick={handleFavoriteClick} className="absolute top-2 right-2 w-7 h-7 md:w-8 md:h-8 bg-white/90 rounded-full shadow-sm flex items-center justify-center z-10 transition-transform hover:scale-110 active:scale-95">
          <svg viewBox="0 0 24 24" fill={isFavorite ? "black" : "none"} stroke="black" strokeWidth={isFavorite ? "0" : "1.5"} className="w-3 h-3 md:w-4 md:h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        
        {/* KAMPANYA ETİKETLERİ */}
        {activeCamp ? (
          <div className="absolute bottom-0 w-full bg-red-600 text-white text-[9px] md:text-[10px] font-black text-center py-1.5 uppercase tracking-widest z-10 shadow-[0_-2px_10px_rgba(220,38,38,0.4)]">
            % {activeCamp.discount_percent} İNDİRİM
          </div>
        ) : badgeLabel ? (
          <div className="absolute bottom-0 w-full bg-black text-white text-[9px] md:text-[10px] font-black text-center py-1.5 uppercase tracking-widest z-10">
            {badgeLabel}
          </div>
        ) : null}
      </div>
      
      <div className="px-1 flex-1 flex flex-col">
        <p className="text-[8px] md:text-[9px] font-black uppercase text-gray-400 tracking-widest truncate mb-0.5">{product.category}</p>
        <h3 className="text-[11px] md:text-sm font-bold text-gray-900 line-clamp-2 h-7 md:h-10 leading-snug mb-1">{product.name}</h3>
        
        <div className="flex items-center gap-1 mb-2">
          <span className={`text-[9px] md:text-[10px] ${ratingCount > 0 ? "text-yellow-400" : "text-gray-300"}`}>
            {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}
          </span>
          <span className="text-[8px] md:text-[9px] font-bold text-gray-400">({ratingCount})</span>
        </div>

        <div className="flex flex-col mt-auto">
          {activeCamp ? (
            <>
              <p className="text-[9px] md:text-[10px] text-gray-400 line-through leading-none mb-0.5">
                {Number(product.price).toLocaleString("tr-TR")} ₺
              </p>
              <p className="text-sm md:text-base font-black text-red-600 leading-none">
                {activePrice.toLocaleString("tr-TR")} ₺
              </p>
            </>
          ) : (
            <p className="text-sm md:text-base font-black text-black leading-none mt-3">
              {activePrice.toLocaleString("tr-TR")} ₺
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}