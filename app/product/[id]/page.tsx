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

  // KAMPANYA
  const [activeCampaign, setActiveCampaign] = useState<any>(null);

  // GALERİ & SWIPE
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // SEKME
  const [activeTab, setActiveTab] = useState<"desc" | "reviews" | "qa">("desc");
  const [reviews, setReviews] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);

  // MODAL & FORM
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [reviewPreviews, setReviewPreviews] = useState<string[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // USER & PURCHASE CHECK
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    const fetchProductAndData = async () => {
      if (!params?.id) return;

      setSelectedImageIndex(0);
      setLoading(true);

      // 1) Ürün
      const { data: pData } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .single();

      if (pData) {
        setProduct(pData);

        // 2) Kampanya sorgulama
        const { data: campData } = await supabase.from("campaigns").select("*");
        if (campData) {
          const nowIso = new Date().toISOString();
          const activeCamp = campData.find((c: any) => {
            const ids = Array.isArray(c.product_ids)
              ? c.product_ids
              : typeof c.product_ids === "string"
              ? JSON.parse(c.product_ids || "[]")
              : [];
            return (
              ids.includes(pData.id) &&
              nowIso >= c.start_date &&
              nowIso <= c.end_date
            );
          });
          setActiveCampaign(activeCamp || null);
        }

        // 3) Ürün görüntülenmesi log
        try {
          const viewedKey = `viewed_product_log_${pData.id}`;
          const isAlreadyViewedThisSession = sessionStorage.getItem(viewedKey);

          if (!isAlreadyViewedThisSession) {
            await supabase.from("product_views").insert([{ product_id: pData.id }]);
            sessionStorage.setItem(viewedKey, "true");
          }
        } catch {}

        // 4) Göz Attıklarım (localStorage)
        const currentViewed = JSON.parse(
          localStorage.getItem("prestige_viewed") || "[]"
        );
        if (!currentViewed.find((item: any) => item.id === pData.id)) {
          const newViewed = [pData, ...currentViewed].slice(0, 10);
          localStorage.setItem("prestige_viewed", JSON.stringify(newViewed));
        }

        // 5) Yorumlar
        const { data: revData } = await supabase
          .from("reviews")
          .select("*")
          .eq("product_id", pData.id)
          .eq("is_approved", true)
          .order("created_at", { ascending: false });
        if (revData) setReviews(revData);

        // 6) Sorular
        const { data: qData } = await supabase
          .from("questions")
          .select("*")
          .eq("product_id", pData.id)
          .eq("is_approved", true)
          .order("created_at", { ascending: false });
        if (qData) setQuestions(qData);

        // 7) Kullanıcı kontrolleri
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setCurrentUser(session.user);

          const { data: favData } = await supabase
            .from("favorites")
            .select("id")
            .eq("user_id", session.user.id)
            .eq("product_id", pData.id)
            .single();
          if (favData) setIsFavorite(true);

          // Satın almış mı?
          try {
            const { data: orders } = await supabase
              .from("orders")
              .select("items")
              .eq("user_id", session.user.id);

            if (orders) {
              const bought = orders.some((order: any) => {
                const itemsList =
                  typeof order.items === "string"
                    ? JSON.parse(order.items)
                    : order.items;

                return (
                  Array.isArray(itemsList) &&
                  itemsList.some((item: any) => item.id === pData.id)
                );
              });

              setHasPurchased(bought);
            }
          } catch {}
        }
      }

      setLoading(false);
    };

    fetchProductAndData();
  }, [params?.id]);

  const handleFavoriteClick = async () => {
    if (!currentUser)
      return alert("Favorilere eklemek için asilce giriş yapmalısınız! 👑");

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

  // CANLI FİYAT HESAPLAMA
  let activePrice = product ? Number(product.price) : 0;
  if (activeCampaign && product) {
    activePrice = Number(product.price) * (1 - activeCampaign.discount_percent / 100);
  }

  const productImages =
    product?.images?.length > 0 ? product.images : [product?.image || "/logo.jpeg"];

  // Galeri prev/next
  const handleNextPrev = (dir: "prev" | "next") => {
    if (dir === "prev") {
      setSelectedImageIndex((p) => (p === 0 ? productImages.length - 1 : p - 1));
    } else {
      setSelectedImageIndex((p) => (p === productImages.length - 1 ? 0 : p + 1));
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    if (distance > 50) handleNextPrev("next");
    else if (distance < -50) handleNextPrev("prev");
    setTouchStartX(0);
    setTouchEndX(0);
  };

  // Auth check
  const checkAuth = async () => {
    if (!currentUser) {
      alert("Bu işlem için giriş yapmalısınız!");
      router.push("/login");
      return null;
    }
    return currentUser;
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await checkAuth();
    if (!user) return;

    if (!comment.trim()) return alert("Lütfen bir yorum yazın.");
    setIsSubmitting(true);

    try {
      const imageUrls: string[] = [];

      for (const file of reviewFiles) {
        const ext = file.name.split(".").pop();
        const fileName = `review_${Date.now()}_${Math.random()
          .toString(16)
          .slice(2)}.${ext}`;

        await supabase.storage.from("products").upload(fileName, file);
        const { data } = supabase.storage.from("products").getPublicUrl(fileName);
        imageUrls.push(data.publicUrl);
      }

      await supabase.from("reviews").insert([
        {
          product_id: product.id,
          user_id: user.id,
          user_name: user.email?.split("@")[0] || "Kullanıcı",
          rating,
          comment,
          images: imageUrls,
        },
      ]);

      alert("Değerlendirmeniz alındı! Yönetici onayından sonra yayınlanacaktır. 🌟");
      setShowReviewModal(false);
      setComment("");
      setRating(5);
      setReviewFiles([]);
      setReviewPreviews([]);
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = await checkAuth();
    if (!user) return;

    if (!questionText.trim()) return alert("Lütfen sorunuzu yazın.");
    setIsSubmitting(true);

    try {
      await supabase.from("questions").insert([
        {
          product_id: product.id,
          user_id: user.id,
          user_name: user.email?.split("@")[0] || "Kullanıcı",
          question: questionText,
        },
      ]);

      alert("Sorunuz satıcıya iletildi! Cevaplandığında burada görünecektir. 💬");
      setShowQuestionModal(false);
      setQuestionText("");
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 3) return alert("En fazla 3 fotoğraf yükleyebilirsiniz.");
    setReviewFiles(files);
    setReviewPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">
        Ürün Hazırlanıyor...
      </div>
    );

  if (!product)
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-black">
        Ürün Bulunamadı
      </div>
    );

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : "0.0";

  return (
    <div className="min-h-screen bg-white pt-6 md:pt-12 pb-32 md:pb-20 px-0 md:px-10">
      {/* Mobil geri */}
      <button
        onClick={() => router.back()}
        className="md:hidden absolute top-4 left-4 z-50 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center text-xl font-bold"
      >
        ←
      </button>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 lg:gap-16">
        {/* SOL: ÜRÜN GÖRSEL */}
        <div className="w-full md:w-1/2 group relative">
          <div
            className="aspect-[4/5] md:aspect-square bg-gray-50 md:rounded-3xl border-b md:border border-gray-100 overflow-hidden relative transition-all"
            onTouchStart={(e) => setTouchStartX(e.targetTouches[0].clientX)}
            onTouchMove={(e) => setTouchEndX(e.targetTouches[0].clientX)}
            onTouchEnd={handleTouchEnd}
          >
            <img
              src={productImages[selectedImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover mix-blend-multiply transition-opacity duration-300 pointer-events-none"
            />

            {/* MOBİL FAVORİ */}
            <button
              onClick={handleFavoriteClick}
              className={`md:hidden absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center transition-transform active:scale-95 ${
                isFavorite ? "text-red-500" : "text-black"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill={isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={isFavorite ? 0 : 1.5}
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </button>

            {productImages.length > 1 && (
              <>
                <button
                  onClick={() => handleNextPrev("prev")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all opacity-0 md:group-hover:opacity-100 active:scale-95 hidden md:block"
                >
                  ◀
                </button>
                <button
                  onClick={() => handleNextPrev("next")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all opacity-0 md:group-hover:opacity-100 active:scale-95 hidden md:block"
                >
                  ▶
                </button>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
                  {productImages.map((_: any, i: number) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === selectedImageIndex ? "w-4 bg-black" : "w-1.5 bg-gray-300"
                      }`}
                    ></div>
                  ))}
                </div>
              </>
            )}

            {/* KAMPANYA ETİKETİ */}
            {activeCampaign && (
              <div className="absolute bottom-0 w-full bg-red-600/90 backdrop-blur-sm text-white text-xs md:text-sm font-black text-center py-2 md:py-3 uppercase tracking-[0.2em] z-10 shadow-[0_-5px_20px_rgba(220,38,38,0.3)]">
                % {activeCampaign.discount_percent} {activeCampaign.name}
              </div>
            )}
          </div>

          {/* DESKTOP THUMBS */}
          {productImages.length > 1 && (
            <div className="hidden md:flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {productImages.map((url: string, index: number) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-20 h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden snap-center transition-all ${
                    index === selectedImageIndex
                      ? "border-black shadow-md scale-105"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SAĞ: DETAY */}
        <div className="w-full md:w-1/2 flex flex-col justify-start px-4 md:px-0">
          <p className="text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-widest mb-1">
            {product.category}
          </p>

          <h1 className="text-2xl md:text-5xl font-black text-black uppercase tracking-tight mb-2 md:mb-4 leading-tight">
            {product.name}
          </h1>

          <div className="flex items-center gap-2 mb-6">
            <span
              className={`text-base md:text-lg ${
                reviews.length > 0 ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              {"★".repeat(Math.round(Number(avgRating)))}
              {"☆".repeat(5 - Math.round(Number(avgRating)))}
            </span>

            <span
              className="text-[10px] md:text-xs font-bold text-gray-400 border-b border-gray-400 cursor-pointer hover:text-black"
              onClick={() => {
                setActiveTab("reviews");
                document.getElementById("tabs")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {avgRating} ({reviews.length} Değerlendirme)
            </span>
          </div>

          {/* FİYAT */}
          <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4 mb-6 md:mb-8">
            {activeCampaign ? (
              <>
                <div className="flex items-center gap-3">
                  <p className="text-4xl md:text-5xl font-black text-red-600 tracking-tighter">
                    {activePrice.toLocaleString("tr-TR")} ₺
                  </p>
                  <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-black uppercase md:hidden">
                    İndirimli
                  </span>
                </div>

                <p className="text-lg md:text-xl font-bold text-gray-400 line-through mt-1 md:mt-0">
                  {Number(product.price).toLocaleString("tr-TR")} ₺
                </p>
              </>
            ) : (
              <p className="text-4xl md:text-5xl font-black text-black tracking-tighter">
                {Number(product.price).toLocaleString("tr-TR")} ₺
              </p>
            )}
          </div>

          {/* DESKTOP BUTONLAR */}
          <div className="hidden md:flex items-center gap-3 mt-4 w-full max-w-[500px]">
            {Number(product.stock) <= 0 ? (
              <button
                disabled
                className="flex-1 h-[54px] bg-gray-50 text-gray-400 rounded-[18px] font-black text-[13px] uppercase border border-gray-200 cursor-not-allowed"
              >
                TÜKENDİ
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: activePrice,
                      image: productImages[0],
                      category: product.category,
                      quantity: 1,
                    });
                    setIsCartOpen(true);
                  }}
                  className="flex-1 h-[54px] bg-white text-black border-[1.5px] border-black rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-50 transition-all flex items-center justify-center active:scale-95"
                >
                  ŞİMDİ AL
                </button>

                <button
                  onClick={() => {
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: activePrice,
                      image: productImages[0],
                      category: product.category,
                      quantity: 1,
                    });
                    alert("Ürün başarıyla sepete eklendi! 🛍️");
                  }}
                  className="flex-1 h-[54px] bg-black text-white rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-800 transition-all shadow-md flex items-center justify-center active:scale-95"
                >
                  SEPETE EKLE
                </button>
              </>
            )}

            <button
              onClick={handleFavoriteClick}
              className={`w-[54px] h-[54px] flex-shrink-0 border rounded-[18px] flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                isFavorite
                  ? "bg-red-50 border-red-200 text-red-500"
                  : "bg-white border-gray-100 text-black hover:scale-105"
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill={isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={isFavorite ? 0 : 1.5}
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            </button>
          </div>

          {/* TABS */}
          <div id="tabs" className="mt-10 md:mt-12">
            <div className="flex gap-4 md:gap-6 border-b border-gray-200 mb-6 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab("desc")}
                className={`pb-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                  activeTab === "desc"
                    ? "border-b-2 border-black text-black"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                Açıklama
              </button>

              <button
                onClick={() => setActiveTab("reviews")}
                className={`pb-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                  activeTab === "reviews"
                    ? "border-b-2 border-black text-black"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                Yorumlar ({reviews.length})
              </button>

              <button
                onClick={() => setActiveTab("qa")}
                className={`pb-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors whitespace-nowrap ${
                  activeTab === "qa"
                    ? "border-b-2 border-black text-black"
                    : "text-gray-400 hover:text-black"
                }`}
              >
                Soru/Cevap ({questions.length})
              </button>
            </div>

            <div className="animate-in fade-in duration-300">
              {/* DESC */}
              {activeTab === "desc" && (
                <div className="bg-gray-50 rounded-2xl p-5 md:p-6 border border-gray-100">
                  {product.description ? (
                    <div>
                      <p className="text-xs md:text-sm font-medium text-gray-600 leading-relaxed whitespace-pre-line">
                        {isDescExpanded || product.description.length <= 150
                          ? product.description
                          : `${product.description.substring(0, 150)}...`}
                      </p>

                      {product.description.length > 150 && (
                        <div className="relative mt-6 md:mt-8 flex justify-center items-center">
                          <div className="absolute w-full border-t border-gray-200"></div>
                          <button
                            onClick={() => setIsDescExpanded(!isDescExpanded)}
                            className="relative z-10 bg-gray-50 hover:bg-white border border-gray-200 text-gray-800 text-[10px] md:text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-full flex items-center transition-all"
                          >
                            {isDescExpanded ? "Daralt" : "Tüm Özellikler"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Açıklama bulunmuyor.</p>
                  )}
                </div>
              )}

              {/* REVIEWS */}
              {activeTab === "reviews" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-2xl md:text-3xl font-black">{avgRating}</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {reviews.length} Yorum
                      </p>
                    </div>

                    {currentUser ? (
                      hasPurchased ? (
                        <button
                          onClick={() => setShowReviewModal(true)}
                          className="bg-black text-white px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
                        >
                          Yorum Yap
                        </button>
                      ) : (
                        <p></p>
                      )
                    ) : (
                      <button
                        onClick={() => router.push("/login")}
                        className="bg-white border border-gray-200 text-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >
                        Giriş Yap
                      </button>
                    )}
                  </div>

                  {reviews.length === 0 ? (
                    <p className="text-center text-xs font-bold text-gray-400 py-10">
                      Henüz yorum yapılmamış.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="border-b border-gray-100 pb-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-yellow-400 text-xs md:text-sm">
                              {"★".repeat(rev.rating)}
                              {"☆".repeat(5 - rev.rating)}
                            </span>
                            <span className="text-[9px] md:text-[10px] font-bold text-gray-400 border-l border-gray-300 pl-2">
                              {new Date(rev.created_at).toLocaleDateString("tr-TR")}
                            </span>
                          </div>

                          <p className="text-xs md:text-sm font-medium text-gray-700 mb-3">
                            {rev.comment}
                          </p>

                          {rev.images && rev.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {rev.images.map((img: string, i: number) => (
                                <img
                                  key={i}
                                  src={img}
                                  className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover border border-gray-200"
                                  alt="Yorum"
                                />
                              ))}
                            </div>
                          )}

                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            {rev.user_name}{" "}
                            <span className="text-green-600 ml-1">✓ Satın Aldı</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* QA */}
              {activeTab === "qa" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] md:text-xs font-bold text-gray-500 w-2/3">
                      Satıcıya ürünle ilgili sorularınızı sorun.
                    </p>
                    <button
                      onClick={() => setShowQuestionModal(true)}
                      className="border border-black text-black px-4 md:px-6 py-2 md:py-3 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest"
                    >
                      Soru Sor
                    </button>
                  </div>

                  {questions.length === 0 ? (
                    <p className="text-center text-xs font-bold text-gray-400 py-10">
                      Henüz soru yok.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((q) => (
                        <div
                          key={q.id}
                          className="bg-gray-50 p-4 rounded-2xl border border-gray-100"
                        >
                          <div className="mb-3">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                              Soru | {q.user_name}
                            </p>
                            <p className="text-xs md:text-sm font-bold text-black">
                              {q.question}
                            </p>
                          </div>

                          {q.answer ? (
                            <div className="pl-4 border-l-2 border-green-500">
                              <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">
                                Satıcı Cevabı
                              </p>
                              <p className="text-xs md:text-sm font-medium text-gray-700">
                                {q.answer}
                              </p>
                            </div>
                          ) : (
                            <p className="text-[9px] font-bold text-orange-500 italic">
                              Yanıt bekleniyor...
                            </p>
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

      {/* MOBİL STICKY BAR */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          {Number(product.stock) <= 0 ? (
            <button
              disabled
              className="flex-1 py-3.5 bg-gray-100 text-gray-400 rounded-xl font-black text-xs uppercase tracking-widest border border-gray-200"
            >
              TÜKENDİ
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: activePrice,
                    image: productImages[0],
                    category: product.category,
                    quantity: 1,
                  });
                  setIsCartOpen(true);
                }}
                className="flex-1 h-[54px] bg-white text-black border-[1.5px] border-black rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-50 transition-all flex items-center justify-center active:scale-95"
              >
                ŞİMDİ AL
              </button>

              <button
                onClick={() => {
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: activePrice,
                    image: productImages[0],
                    category: product.category,
                    quantity: 1,
                  });
                  alert("Ürün başarıyla sepete eklendi! 🛍️");
                }}
                className="flex-1 h-[54px] bg-black text-white rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-800 transition-all shadow-md flex items-center justify-center active:scale-95"
              >
                SEPETE EKLE
              </button>
            </>
          )}
        </div>
      </div>

      {/* YORUM MODALI */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Değerlendir</h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitReview} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Puanınız
                </label>
                <div className="flex gap-2 text-3xl">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`transition-colors ${
                        star <= rating ? "text-yellow-400" : "text-gray-200 hover:text-yellow-200"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Yorumunuz
                </label>
                <textarea
                  required
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none"
                  placeholder="Ürün beklentilerinizi karşıladı mı?"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Fotoğraf Ekle (Opsiyonel)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleReviewFileChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-black cursor-pointer"
                />
                {reviewPreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto mt-3 pb-2">
                    {reviewPreviews.map((url, i) => (
                      <img key={i} src={url} className="w-16 h-16 object-cover rounded-lg border border-gray-200" alt="" />
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest mt-2 disabled:opacity-60"
              >
                {isSubmitting ? "Gönderiliyor..." : "Yorumu Gönder"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SORU MODALI */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Soru Sor</h2>
              <button
                onClick={() => setShowQuestionModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitQuestion} className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Sorunuz
                </label>
                <textarea
                  required
                  rows={4}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none"
                  placeholder="Ürün ölçüleri, materyali vb. konularda satıcıya sorun..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest mt-2 disabled:opacity-60"
              >
                {isSubmitting ? "Gönderiliyor..." : "Soruyu İlet"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}