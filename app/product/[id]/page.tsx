"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, setIsCartOpen } = useCart();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);

  // GALERİ İÇİN STATELER
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // SWIPE (KAYDIRMA) İÇİN STATELER
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);

  // DEVAMINI OKU İÇİN STATE
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  useEffect(() => {
    const fetchProductAndRecordView = async () => {
      if (!params.id) return;
      setSelectedImageIndex(0);
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .single();

      if (data) {
        setProduct(data);
        
        // Göz Attıklarım Hafızası
        const currentViewed = JSON.parse(localStorage.getItem("prestige_viewed") || "[]");
        const isExistViewed = currentViewed.find((item: any) => item.id === data.id);
        if (!isExistViewed) {
          const newViewed = [data, ...currentViewed].slice(0, 10);
          localStorage.setItem("prestige_viewed", JSON.stringify(newViewed));
        }

        // Favori Kontrolü
        const currentFavs = JSON.parse(localStorage.getItem("prestige_favorites") || "[]");
        const isFav = currentFavs.find((fav: any) => fav.id === data.id);
        setIsFavorite(!!isFav);
      }
      setLoading(false);
    };

    fetchProductAndRecordView();
  }, [params.id]);

  const handleFavoriteClick = async () => {
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

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">Ürün Hazırlanıyor...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-black">Ürün Bulunamadı</div>;

  // Resim listesini güvenli hale getir
  const productImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.image || "/logo.jpeg"];

  const activePrice = product ? (Number(product.discount_price) > 0 ? Number(product.discount_price) : Number(product.price)) : 0;

  const handleAddToCart = () => {
    if (product) {
      addToCart({ 
        id: product.id,
        name: product.name,
        price: activePrice,
        image: productImages[selectedImageIndex],
        category: product.category,
        quantity: 1 
      });
      setIsCartOpen(true);
    }
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart({ 
        id: product.id,
        name: product.name,
        price: activePrice,
        image: productImages[selectedImageIndex],
        category: product.category,
        quantity: 1 
      });
      router.push("/checkout"); 
    }
  };

  // --- OK TUŞLARI & SWIPE (KAYDIRMA) FONKSİYONLARI ---
  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1));
  };

  // Ekrana Dokunma Başlangıcı
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
  };

  // Ekranda Parmağı Sürükleme
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  // Dokunma Bittiğinde Yönü Hesapla
  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 50; // Sola kaydırma (Sonraki resim)
    const isRightSwipe = distance < -50; // Sağa kaydırma (Önceki resim)

    if (isLeftSwipe) {
      handleNextImage();
    } else if (isRightSwipe) {
      handlePrevImage();
    }

    // Değerleri sıfırla
    setTouchStartX(0);
    setTouchEndX(0);
  };
  // ----------------------------------------------------

  // --- AÇIKLAMA METNİ LİMİTİ ---
  const DESC_MAX_LENGTH = 150;
  const hasLongDesc = product.description && product.description.length > DESC_MAX_LENGTH;

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10 lg:gap-16">
        
        {/* SOL: ÜRÜN GÖRSELİ VE GALERİ */}
        <div className="w-full md:w-1/2 group relative">
          
          {/* ANA RESİM ÇERÇEVESİ (SWIPE EKLENDİ) */}
          <div 
            className="aspect-square bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden relative transition-all"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <img 
              src={productImages[selectedImageIndex]} 
              alt={product.name} 
              className="w-full h-full object-cover mix-blend-multiply transition-opacity duration-300 pointer-events-none" 
            />

            {/* --- OK TUŞLARI (Sadece birden fazla resim varsa ve Mouse ile üzerine gelince göster) --- */}
            {productImages.length > 1 && (
              <>
                {/* SOL OK */}
                <button 
                  onClick={handlePrevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all opacity-0 md:group-hover:opacity-100 active:scale-95 hidden md:block"
                  aria-label="Önceki Resim"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                </button>

                {/* SAĞ OK */}
                <button 
                  onClick={handleNextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all opacity-0 md:group-hover:opacity-100 active:scale-95 hidden md:block"
                  aria-label="Sonraki Resim"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
                
                {/* MOBİL İÇİN MİNİK KAYDIRMA BİLGİSİ */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase md:hidden pointer-events-none">
                  Kaydırarak İncele
                </div>
              </>
            )}
            {/* ------------------------------------------------------- */}
          </div>

          {/* KÜÇÜK RESİMLER (THUMBNAILS) */}
          {productImages.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {productImages.map((url: string, index: number) => (
                <button 
                  key={index} 
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-20 h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden snap-center transition-all ${
                    index === selectedImageIndex 
                      ? "border-black opacity-100 shadow-md scale-105" 
                      : "border-transparent opacity-60 hover:opacity-100 hover:border-gray-300"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SAĞ: ÜRÜN DETAYLARI */}
        <div className="w-full md:w-1/2 flex flex-col justify-center">
          <h1 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight mb-4 leading-none">
            {product.name}
          </h1>
          
          {/* FİYAT ALANI */}
          <div className="flex items-baseline gap-4 mb-8">
            {Number(product.discount_price) > 0 ? (
              <>
                <p className="text-4xl font-black text-red-600 tracking-tighter">{Number(product.discount_price).toLocaleString("tr-TR")} ₺</p>
                <p className="text-lg font-bold text-gray-400 line-through">{Number(product.price).toLocaleString("tr-TR")} ₺</p>
              </>
            ) : (
              <p className="text-4xl font-black text-black tracking-tighter">{Number(product.price).toLocaleString("tr-TR")} ₺</p>
            )}
          </div>

          {/* BUTONLAR */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <button onClick={handleBuyNow} className="flex-1 min-w-[140px] border-2 border-black bg-white text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-gray-50 transition-all active:scale-95">
              ŞİMDİ AL
            </button>
            <button onClick={handleAddToCart} className="flex-1 min-w-[140px] bg-black text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all active:scale-95">
              SEPETE EKLE
            </button>
            <button onClick={handleFavoriteClick} className="w-14 h-14 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-all group" title="Favorilere Ekle">
              <svg viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isFavorite ? "0" : "2"} className={`w-6 h-6 ${isFavorite ? "text-black" : "text-gray-400 group-hover:text-black"}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          </div>

          {/* KARGO */}
          <div className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 mb-6">
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-black">Tahmini Kargoya Teslim</p>
              <p className="text-sm font-medium text-gray-500">2 gün içinde kargoda</p>
            </div>
          </div>

          {/* ÜRÜN AÇIKLAMASI (DEVAMINI OKU SİSTEMİ) */}
          <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm mt-4">
             <h3 className="text-xs font-black uppercase tracking-widest text-black border-b-2 border-black inline-block pb-1 mb-4">
               Ürün Açıklaması
             </h3>
             {product.description ? (
               <div className="transition-all duration-300">
                 <p className="text-sm font-medium text-gray-600 leading-relaxed whitespace-pre-line">
                   {isDescExpanded || !hasLongDesc 
                     ? product.description 
                     : `${product.description.substring(0, DESC_MAX_LENGTH)}...`}
                 </p>
                 
                 {/* YENİ PREMIUM BUTON TASARIMI */}
                 {hasLongDesc && (
                   <div className="relative mt-8 flex justify-center items-center">
                     {/* Arkadaki ince yatay çizgi */}
                     <div className="absolute w-full border-t border-gray-200"></div>
                     
                     {/* Hap Tasarımlı Buton */}
                     <button 
                       onClick={() => setIsDescExpanded(!isDescExpanded)}
                       className="relative z-10 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 text-[11px] font-bold tracking-widest uppercase px-6 py-3 rounded-full flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                     >
                       {isDescExpanded ? "AÇIKLAMAYI DARALT" : "ÜRÜNÜN TÜM ÖZELLİKLERİ"}
                       <svg 
                         xmlns="http://www.w3.org/2000/svg" 
                         fill="none" 
                         viewBox="0 0 24 24" 
                         strokeWidth={3} 
                         stroke="currentColor" 
                         className={`w-3.5 h-3.5 transition-transform duration-300 ${isDescExpanded ? "rotate-180" : ""}`}
                       >
                         <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                       </svg>
                     </button>
                   </div>
                 )}
               </div>
             ) : (
               <p className="text-sm font-medium text-gray-400 italic">
                 Bu ürün için henüz detaylı bir açıklama girilmemiş.
               </p>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}