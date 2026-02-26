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

  // GALERİ & SWIPE STATELERİ
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // SEKME VE VERİ STATELERİ
  const [activeTab, setActiveTab] = useState<"desc" | "reviews" | "qa">("desc");
  const [reviews, setReviews] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // MODAL VE FORM STATELERİ
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [reviewPreviews, setReviewPreviews] = useState<string[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // KULLANICI VE SATIN ALMA KONTROLÜ
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    const fetchProductAndData = async () => {
      if (!params.id) return;
      setSelectedImageIndex(0);
      setLoading(true);

      // 1. Ürünü Çek
      const { data: pData } = await supabase.from("products").select("*").eq("id", params.id).single();

      if (pData) {
        setProduct(pData);
        
        // Göz Attıklarım (Yerel Hafıza - Sadece gezinme geçmişi için)
        const currentViewed = JSON.parse(localStorage.getItem("prestige_viewed") || "[]");
        if (!currentViewed.find((item: any) => item.id === pData.id)) {
          const newViewed = [pData, ...currentViewed].slice(0, 10);
          localStorage.setItem("prestige_viewed", JSON.stringify(newViewed));
        }

        // 2. ONAYLANMIŞ Yorumları ve Soruları Çek
        const { data: revData } = await supabase.from("reviews").select("*").eq("product_id", pData.id).eq("is_approved", true).order("created_at", { ascending: false });
        if (revData) setReviews(revData);

        const { data: qData } = await supabase.from("questions").select("*").eq("product_id", pData.id).eq("is_approved", true).order("created_at", { ascending: false });
        if (qData) setQuestions(qData);

        // 3. KULLANICI GİRİŞ YAPMIŞ MI, SATIN ALMIŞ MI VE FAVORİLEMİŞ Mİ?
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setCurrentUser(session.user);
          
          // Favori Kontrolü (Veritabanından)
          const { data: favData } = await supabase
            .from("favorites")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("product_id", pData.id)
            .single();
          if (favData) setIsFavorite(true);

          try {
            // Sipariş Kontrolü
            const { data: orders } = await supabase.from("orders").select("items").eq("user_id", session.user.id);
            if (orders) {
              const bought = orders.some(order => {
                const itemsList = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                return Array.isArray(itemsList) && itemsList.some((item: any) => item.id === pData.id);
              });
              setHasPurchased(bought);
            }
          } catch (e) {
            console.error("Sipariş doğrulama hatası:", e);
          }
        }
      }
      setLoading(false);
    };

    fetchProductAndData();
  }, [params.id]);
  // --- FAVORİ VE SEPET MOTORLARI ---
  const handleFavoriteClick = async () => {
    if (!currentUser) return alert("Favorilere eklemek için asilce giriş yapmalısınız! 👑");

    if (isFavorite) {
      setIsFavorite(false);
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("product_id", product.id);
    } else {
      setIsFavorite(true);
      await supabase
        .from("favorites")
        .insert([{ user_id: currentUser.id, product_id: product.id }]);
    }
  };

  const activePrice = product ? (Number(product.discount_price) > 0 ? Number(product.discount_price) : Number(product.price)) : 0;
  const productImages = product?.images?.length > 0 ? product.images : [product?.image || "/logo.jpeg"];

  // --- SWIPE (KAYDIRMA) VE GALERİ ---
  const handleNextPrev = (dir: "prev" | "next") => {
    if (dir === "prev") setSelectedImageIndex((p) => (p === 0 ? productImages.length - 1 : p - 1));
    else setSelectedImageIndex((p) => (p === productImages.length - 1 ? 0 : p + 1));
  };
  
  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > 50) handleNextPrev("next");
    else if (distance < -50) handleNextPrev("prev");
    setTouchStartX(0); setTouchEndX(0);
  };

  // --- YORUM VE SORU GÖNDERME ---
  const checkAuth = async () => {
    if (!currentUser) { alert("Bu işlem için giriş yapmalısınız!"); router.push("/login"); return null; }
    return currentUser;
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await checkAuth(); if (!user) return;
    if (!comment.trim()) return alert("Lütfen bir yorum yazın.");
    setIsSubmitting(true);

    try {
      const imageUrls = [];
      for (const file of reviewFiles) {
        const ext = file.name.split(".").pop();
        const fileName = `review_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("products").upload(fileName, file);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("products").getPublicUrl(fileName);
        imageUrls.push(data.publicUrl);
      }

      const { error } = await supabase.from("reviews").insert([{
        product_id: product.id, user_id: user.id, user_name: user.email?.split("@")[0] || "Kullanıcı",
        rating, comment, images: imageUrls
      }]);
      if (error) throw error;

      alert("Değerlendirmeniz alındı! Yönetici onayından sonra yayınlanacaktır. 🌟");
      setShowReviewModal(false); setComment(""); setRating(5); setReviewFiles([]); setReviewPreviews([]);
    } catch (err: any) { alert("Hata: " + err.message); } finally { setIsSubmitting(false); }
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await checkAuth(); if (!user) return;
    if (!questionText.trim()) return alert("Lütfen sorunuzu yazın.");
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("questions").insert([{
        product_id: product.id, user_id: user.id, user_name: user.email?.split("@")[0] || "Kullanıcı", question: questionText
      }]);
      if (error) throw error;
      alert("Sorunuz satıcıya iletildi! Cevaplandığında burada görünecektir. 💬");
      setShowQuestionModal(false); setQuestionText("");
    } catch (err: any) { alert("Hata: " + err.message); } finally { setIsSubmitting(false); }
  };

  const handleReviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 3) return alert("En fazla 3 fotoğraf yükleyebilirsiniz.");
    setReviewFiles(files); setReviewPreviews(files.map(f => URL.createObjectURL(f)));
  };
  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">Ürün Hazırlanıyor...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-black">Ürün Bulunamadı</div>;

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen bg-white pt-24 pb-20 px-4 md:px-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10 lg:gap-16">
        
        {/* SOL: ÜRÜN GÖRSELİ */}
        <div className="w-full md:w-1/2 group relative">
          <div 
            className="aspect-square bg-gray-50 rounded-3xl border border-gray-100 overflow-hidden relative transition-all"
            onTouchStart={(e) => setTouchStartX(e.targetTouches[0].clientX)}
            onTouchMove={(e) => setTouchEndX(e.targetTouches[0].clientX)}
            onTouchEnd={handleTouchEnd}
          >
            <img src={productImages[selectedImageIndex]} alt={product.name} className="w-full h-full object-cover mix-blend-multiply transition-opacity duration-300 pointer-events-none" />
            {productImages.length > 1 && (
              <>
                <button onClick={() => handleNextPrev("prev")} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all opacity-0 md:group-hover:opacity-100 active:scale-95 hidden md:block">◀</button>
                <button onClick={() => handleNextPrev("next")} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all opacity-0 md:group-hover:opacity-100 active:scale-95 hidden md:block">▶</button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase md:hidden pointer-events-none">Kaydırarak İncele</div>
              </>
            )}
          </div>
          {productImages.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {productImages.map((url: string, index: number) => (
                <button key={index} onClick={() => setSelectedImageIndex(index)} className={`w-20 h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden snap-center transition-all ${index === selectedImageIndex ? "border-black shadow-md scale-105" : "border-transparent opacity-60 hover:opacity-100"}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SAĞ: ÜRÜN DETAYLARI VE SEKMELER */}
        <div className="w-full md:w-1/2 flex flex-col justify-start">
          <h1 className="text-3xl md:text-5xl font-black text-black uppercase tracking-tight mb-2 leading-none">{product.name}</h1>
          <div className="flex items-center gap-2 mb-4">
             <span className={`text-lg ${reviews.length > 0 ? "text-yellow-400" : "text-gray-300"}`}>
               {"★".repeat(Math.round(Number(avgRating)))}{"☆".repeat(5 - Math.round(Number(avgRating)))}
             </span>
             <span className="text-xs font-bold text-gray-400 border-b border-gray-400 cursor-pointer hover:text-black" onClick={() => setActiveTab("reviews")}>
               {avgRating} ({reviews.length} Değerlendirme)
             </span>
          </div>
          
          <div className="flex items-baseline gap-4 mb-8">
            {Number(product.discount_price) > 0 ? (
              <><p className="text-4xl font-black text-red-600 tracking-tighter">{Number(product.discount_price).toLocaleString("tr-TR")} ₺</p><p className="text-lg font-bold text-gray-400 line-through">{Number(product.price).toLocaleString("tr-TR")} ₺</p></>
            ) : (<p className="text-4xl font-black text-black tracking-tighter">{Number(product.price).toLocaleString("tr-TR")} ₺</p>)}
          </div>

          <div className="flex items-center gap-3 mt-8 w-full max-w-[500px]">
            {Number(product.stock) <= 0 ? (
              <button 
                disabled 
                className="flex-1 h-[54px] bg-gray-50 text-gray-400 rounded-[18px] font-black text-[13px] uppercase border border-gray-200 cursor-not-allowed flex items-center justify-center tracking-tight"
              >
                TÜKENDİ
              </button>
            ) : (
              <>
                <button 
                  onClick={() => {
                    addToCart({ id: product.id, name: product.name, price: activePrice, image: productImages[0], category: product.category, quantity: 1 });
                    router.push('/checkout');
                  }}
                  className="flex-1 h-[54px] bg-white text-black border-[1.5px] border-black rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-50 transition-all flex items-center justify-center whitespace-nowrap active:scale-95"
                >
                  ŞİMDİ AL
                </button>
                
                <button 
                  onClick={() => {
                    addToCart({ id: product.id, name: product.name, price: activePrice, image: productImages[0], category: product.category, quantity: 1 });
                    setIsCartOpen(true);
                  }}
                  className="flex-1 h-[54px] bg-black text-white rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-800 transition-all shadow-md flex items-center justify-center whitespace-nowrap active:scale-95"
                >
                  SEPETE EKLE
                </button>
              </>
            )}

            {/* CANLI FAVORİ BUTONU */}
            <button 
              onClick={handleFavoriteClick}
              className={`w-[54px] h-[54px] flex-shrink-0 border rounded-[18px] flex items-center justify-center transition-all shadow-sm active:scale-95
                ${isFavorite ? "bg-red-50 border-red-200 text-red-500" : "bg-white border-gray-100 text-black hover:scale-105"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isFavorite ? 0 : 1.5} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            </button>
          </div>

          {/* BİLGİ SEKMELERİ (TABS) */}
          <div className="mt-12">
            <div className="flex gap-6 border-b border-gray-200 mb-6 overflow-x-auto hide-scrollbar">
              <button onClick={() => setActiveTab("desc")} className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === "desc" ? "border-b-2 border-black text-black" : "text-gray-400 hover:text-black"}`}>Ürün Açıklaması</button>
              <button onClick={() => setActiveTab("reviews")} className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === "reviews" ? "border-b-2 border-black text-black" : "text-gray-400 hover:text-black"}`}>Değerlendirmeler ({reviews.length})</button>
              <button onClick={() => setActiveTab("qa")} className={`pb-3 text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${activeTab === "qa" ? "border-b-2 border-black text-black" : "text-gray-400 hover:text-black"}`}>Soru & Cevap ({questions.length})</button>
            </div>

            {/* SEKME İÇERİKLERİ */}
            <div className="animate-in fade-in duration-300">
              
              {/* 1. AÇIKLAMA SEKME */}
              {activeTab === "desc" && (
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                  {product.description ? (
                    <div>
                      <p className="text-sm font-medium text-gray-600 leading-relaxed whitespace-pre-line">
                        {isDescExpanded || product.description.length <= 150 ? product.description : `${product.description.substring(0, 150)}...`}
                      </p>
                      {product.description.length > 150 && (
                        <div className="relative mt-8 flex justify-center items-center">
                          <div className="absolute w-full border-t border-gray-200"></div>
                          <button onClick={() => setIsDescExpanded(!isDescExpanded)} className="relative z-10 bg-gray-50 hover:bg-white border border-gray-200 text-gray-800 text-[11px] font-bold tracking-widest uppercase px-6 py-3 rounded-full flex items-center gap-2 transition-all">
                            {isDescExpanded ? "Daralt" : "Tüm Özellikler"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : <p className="text-sm text-gray-400 italic">Açıklama bulunmuyor.</p>}
                </div>
              )}

              {/* 2. DEĞERLENDİRMELER SEKME */}
              {activeTab === "reviews" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-3xl font-black">{avgRating}</p>
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{reviews.length} Değerlendirme</p>
                    </div>
                    {currentUser ? (
                      hasPurchased ? (
                        <button onClick={() => setShowReviewModal(true)} className="bg-black text-white px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">Yorum Yap</button>
                      ) : (
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest text-right max-w-[120px] leading-tight"></p>
                      )
                    ) : (
                      <button onClick={() => router.push("/login")} className="bg-white border border-gray-200 text-black px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Giriş Yap</button>
                    )}
                  </div>
                  
                  {reviews.length === 0 ? (
                    <p className="text-center text-sm font-bold text-gray-400 py-10">Bu ürün için henüz yorum yapılmamış. İlk değerlendiren sen ol!</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="border-b border-gray-100 pb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-yellow-400 text-sm">{"★".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</span>
                            <span className="text-[10px] font-bold text-gray-400 border-l border-gray-300 pl-2">{new Date(rev.created_at).toLocaleDateString("tr-TR")}</span>
                          </div>
                          <p className="text-sm font-medium text-gray-700 mb-3">{rev.comment}</p>
                          {rev.images && rev.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {rev.images.map((img: string, i: number) => <img key={i} src={img} className="w-16 h-16 rounded-lg object-cover border border-gray-200" alt="Yorum" />)}
                            </div>
                          )}
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{rev.user_name} <span className="text-green-600 ml-1">✓ Satın Aldı</span></p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. SORU CEVAP SEKME */}
              {activeTab === "qa" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-gray-500">Ürün hakkında merak ettiklerinizi satıcıya sorun.</p>
                    <button onClick={() => setShowQuestionModal(true)} className="border border-black text-black px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Soru Sor</button>
                  </div>

                  {questions.length === 0 ? (
                    <p className="text-center text-sm font-bold text-gray-400 py-10">Henüz soru sorulmamış.</p>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((q) => (
                        <div key={q.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                          <div className="mb-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Soru | {q.user_name}</p>
                            <p className="text-sm font-bold text-black">{q.question}</p>
                          </div>
                          {q.answer ? (
                            <div className="pl-4 border-l-2 border-green-500">
                              <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Satıcı Cevabı</p>
                              <p className="text-sm font-medium text-gray-700">{q.answer}</p>
                            </div>
                          ) : (
                            <p className="text-[10px] font-bold text-orange-500 italic">Satıcı yanıtı bekleniyor...</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* YORUM YAP MODALI */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Değerlendir</h2>
              <button onClick={() => setShowReviewModal(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            <form onSubmit={submitReview} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Puanınız</label>
                <div className="flex gap-2 text-3xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button type="button" key={star} onClick={() => setRating(star)} className={`transition-colors ${star <= rating ? "text-yellow-400" : "text-gray-200 hover:text-yellow-200"}`}>★</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Yorumunuz</label>
                <textarea required rows={4} value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none" placeholder="Ürün beklentilerinizi karşıladı mı?" />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Fotoğraf Ekle (Opsiyonel)</label>
                <input type="file" accept="image/*" multiple onChange={handleReviewFileChange} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-black cursor-pointer" />
                {reviewPreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mt-3 pb-2">
                    {reviewPreviews.map((url, i) => <img key={i} src={url} className="w-16 h-16 object-cover rounded-lg border border-gray-200" alt="" />)}
                  </div>
                )}
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest mt-2 disabled:opacity-60">{isSubmitting ? "Gönderiliyor..." : "Yorumu Gönder"}</button>
            </form>
          </div>
        </div>
      )}

      {/* SORU SOR MODALI */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Soru Sor</h2>
              <button onClick={() => setShowQuestionModal(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            <form onSubmit={submitQuestion} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Sorunuz</label>
                <textarea required rows={4} value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none" placeholder="Ürün ölçüleri, materyali vb. konularda satıcıya sorun..." />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest mt-2 disabled:opacity-60">{isSubmitting ? "Gönderiliyor..." : "Soruyu İlet"}</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}