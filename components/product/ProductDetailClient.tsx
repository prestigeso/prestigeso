"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { useAppAlert } from "@/context/AppAlertContext";
import { getErrorMessage } from "@/lib/utils";
import { getEffectiveUnitPrice } from "@/lib/commerce/pricing";
import ProductFeedbackDialogs from "@/components/product/ProductFeedbackDialogs";
import ProductAuthModal from "@/components/product/ProductAuthModal";
import {
  ALLOWED_REVIEW_IMAGE_TYPES,
  MAX_REVIEW_IMAGES,
  MAX_REVIEW_IMAGE_SIZE_BYTES,
  MAX_REVIEW_IMAGE_SIZE_MB,
} from "@/lib/products/productDetail";
import { useProductDetailData } from "@/hooks/useProductDetailData";
import type { Product } from "@/types";

export default function ProductDetailClient({
  initialProduct,
}: {
  initialProduct: Product;
}) {
  const params = useParams();
  const router = useRouter();
  const { addToCart, setIsCartOpen } = useCart();
  const { showToast } = useAppAlert();

  const rawProductId = params?.id;
  const productId = Array.isArray(rawProductId)
    ? rawProductId[0] || ""
    : String(rawProductId || "");
  const {
    product,
    loading,
    isFavorite,
    setIsFavorite,
    activeCampaign,
    reviews,
    questions,
    currentUser,
    setCurrentUser,
    hasPurchased,
    variants,
  } = useProductDetailData(productId, initialProduct);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchEndX, setTouchEndX] = useState(0);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<"desc" | "reviews" | "qa">("desc");

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [reviewPreviews, setReviewPreviews] = useState<string[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState(
    "Bu işlem için giriş yapmanız gerekiyor.",
  );

  useEffect(() => {
    return () => {
      reviewPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [reviewPreviews]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedVariantId(null);
  }, [productId]);

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) || null;

  const checkAuth = async (
    message = "Bu işlem için giriş yapmanız gerekiyor.",
  ) => {
    if (currentUser) return currentUser;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setAuthModalMessage(message);
      setShowAuthModal(true);
      return null;
    }

    setCurrentUser(session.user);
    return session.user;
  };

  const handleFavoriteClick = async () => {
    const user = await checkAuth(
      "Favorilere eklemek için giriş yapmanız gerekiyor.",
    );
    if (!user || !product) return;

    if (isFavorite) {
      setIsFavorite(false);

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", product.id);

      if (error) {
        setIsFavorite(true);
        showToast("Favorilerden kaldırılırken bir hata oluştu.", "error");
        return;
      }

      showToast("Ürün favorilerden kaldırıldı.", "success");
      return;
    }

    setIsFavorite(true);

    const { error } = await supabase
      .from("favorites")
      .insert([{ user_id: user.id, product_id: product.id }]);

    if (error) {
      setIsFavorite(false);
      showToast("Favorilere eklenirken bir hata oluştu.", "error");
      return;
    }

    showToast("Ürün favorilere eklendi.", "success");
  };

  const openQuestionModal = async () => {
    const user = await checkAuth(
      "Soru sorabilmek için giriş yapmanız gerekiyor.",
    );
    if (!user) return;
    setShowQuestionModal(true);
  };

  const openReviewModal = async () => {
    const user = await checkAuth(
      "Yorum yapabilmek için giriş yapmanız gerekiyor.",
    );
    if (!user) return;

    if (!hasPurchased) {
      showToast(
        "Yorum yapabilmek için bu ürünü satın almış olmanız gerekir.",
        "warning",
      );
      return;
    }

    setShowReviewModal(true);
  };

  const activePrice = useMemo(() => {
    if (!product) return 0;

    const basePrice = selectedVariant?.price ?? product.price;
    return getEffectiveUnitPrice({
      basePrice,
      discountPrice:
        selectedVariant?.price == null ? product.discount_price : undefined,
      campaignPercent: activeCampaign?.discount_percent,
    });
  }, [activeCampaign, product, selectedVariant]);

  const productImages: string[] =
    product && Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product?.image || "/logo.jpeg"];
  const availableStock = Number(
    variants.length > 0 ? selectedVariant?.stock || 0 : product?.stock || 0,
  );
  const displayBasePrice = Number(selectedVariant?.price ?? product?.price ?? 0);
  const hasPriceDiscount = activePrice < displayBasePrice;

  const handleNextPrev = (dir: "prev" | "next") => {
    if (dir === "prev") {
      setSelectedImageIndex((prev) =>
        prev === 0 ? productImages.length - 1 : prev - 1,
      );
    } else {
      setSelectedImageIndex((prev) =>
        prev === productImages.length - 1 ? 0 : prev + 1,
      );
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

  const addProductToCart = (openCart = false) => {
    if (!product) return;
    if (variants.length > 0 && !selectedVariant) {
      showToast("Lütfen bir ürün seçeneği belirleyin.", "warning");
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: activePrice,
      image: productImages[0],
      category: product.category,
      quantity: 1,
      stock: Number(selectedVariant?.stock ?? product.stock ?? 0),
      ...(selectedVariant
        ? {
            variant_id: selectedVariant.id,
            variant_label: Object.entries(selectedVariant.option_values)
              .map(([name, value]) => `${name}: ${value}`)
              .join(" / "),
            variant_options: selectedVariant.option_values,
            SKU: selectedVariant.sku,
          }
        : {}),
    });

    if (openCart) {
      setIsCartOpen(true);
    } else {
      showToast("Ürün başarıyla sepete eklendi.", "success");
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = await checkAuth(
      "Yorum yapabilmek için giriş yapmanız gerekiyor.",
    );
    if (!user || !product) return;

    if (!hasPurchased) {
      showToast(
        "Yorum yapabilmek için ürünü satın almış olmanız gerekir.",
        "warning",
      );
      return;
    }

    if (!comment.trim()) {
      showToast("Lütfen bir yorum yazın.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Oturumunuz sona ermiş.");
      const formData = new FormData();
      formData.set("productId", String(product.id));
      formData.set("rating", String(rating));
      formData.set("comment", comment.trim());
      reviewFiles.forEach((file) => formData.append("images", file));
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Değerlendirme kaydedilemedi.");

      showToast(
        "Değerlendirmeniz alındı. Yönetici onayından sonra yayınlanacaktır.",
        "success",
      );

      setShowReviewModal(false);
      setComment("");
      setRating(5);
      setReviewFiles([]);
      setReviewPreviews([]);
    } catch (error: unknown) {
      showToast("Hata: " + getErrorMessage(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = await checkAuth(
      "Soru sorabilmek için giriş yapmanız gerekiyor.",
    );
    if (!user || !product) return;

    if (!questionText.trim()) {
      showToast("Lütfen sorunuzu yazın.", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("questions").insert([
        {
          product_id: product.id,
          user_id: user.id,
          user_name: user.email?.split("@")[0] || "Kullanıcı",
          question: questionText,
          is_approved: false,
        },
      ]);

      if (error) throw error;

      showToast(
        "Sorunuz satıcıya iletildi. Cevaplandığında burada görünecektir.",
        "success",
      );

      setShowQuestionModal(false);
      setQuestionText("");
    } catch (error: unknown) {
      showToast("Hata: " + getErrorMessage(error), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length > MAX_REVIEW_IMAGES) {
      e.target.value = "";
      showToast(
        `En fazla ${MAX_REVIEW_IMAGES} fotoğraf yükleyebilirsiniz.`,
        "warning",
      );
      return;
    }

    const invalidFile = files.find(
      (file) =>
        !ALLOWED_REVIEW_IMAGE_TYPES[file.type] ||
        file.size > MAX_REVIEW_IMAGE_SIZE_BYTES,
    );

    if (invalidFile) {
      e.target.value = "";
      showToast(
        `Fotoğraflar JPG, PNG, WEBP veya AVIF formatında ve en fazla ${MAX_REVIEW_IMAGE_SIZE_MB} MB olmalıdır.`,
        "warning",
      );
      return;
    }

    reviewPreviews.forEach((url) => URL.revokeObjectURL(url));

    setReviewFiles(files);
    setReviewPreviews(files.map((file) => URL.createObjectURL(file)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">
        Ürün Hazırlanıyor...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-black">
        Ürün Bulunamadı
      </div>
    );
  }

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, review) => acc + Number(review.rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : "0.0";

  return (
    <div className="min-h-screen bg-white pt-6 md:pt-12 pb-32 md:pb-20 px-0 md:px-10">
      <button
        type="button"
        onClick={() => router.back()}
        className="md:hidden absolute top-4 left-4 z-50 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center text-xl font-bold"
      >
        ←
      </button>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-6 lg:gap-16">
        <div className="w-full md:w-1/2 group relative">
          <div
            className="aspect-[4/5] md:aspect-square bg-gray-50 md:rounded-3xl border-b md:border border-gray-100 overflow-hidden relative transition-all"
            onTouchStart={(e) => setTouchStartX(e.targetTouches[0].clientX)}
            onTouchMove={(e) => setTouchEndX(e.targetTouches[0].clientX)}
            onTouchEnd={handleTouchEnd}
          >
            <Image
              src={productImages[selectedImageIndex]}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover mix-blend-multiply transition-opacity duration-300 pointer-events-none"
            />

            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`md:hidden absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center transition-transform active:scale-95 ${
                isFavorite ? "text-red-500" : "text-black"
              }`}
              aria-label="Favori"
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
                  type="button"
                  onClick={() => handleNextPrev("prev")}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all opacity-0 md:group-hover:opacity-100 active:scale-95 hidden md:block"
                >
                  ◀
                </button>

                <button
                  type="button"
                  onClick={() => handleNextPrev("next")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-black p-3 rounded-full shadow-lg transition-all opacity-0 md:group-hover:opacity-100 active:scale-95 hidden md:block"
                >
                  ▶
                </button>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
                  {productImages.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === selectedImageIndex
                          ? "w-4 bg-black"
                          : "w-1.5 bg-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            {activeCampaign && (
              <div className="absolute bottom-0 w-full bg-red-600/90 backdrop-blur-sm text-white text-xs md:text-sm font-black text-center py-2 md:py-3 uppercase tracking-[0.2em] z-10 shadow-[0_-5px_20px_rgba(220,38,38,0.3)]">
                % {activeCampaign.discount_percent} {activeCampaign.name}
              </div>
            )}
          </div>

          {productImages.length > 1 && (
            <div className="hidden md:flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
              {productImages.map((url: string, index: number) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative w-20 h-20 flex-shrink-0 rounded-xl border-2 overflow-hidden snap-center transition-all ${
                    index === selectedImageIndex
                      ? "border-black shadow-md scale-105"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="w-full md:w-1/2 flex flex-col justify-start px-4 md:px-0">
          <p className="text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-widest mb-1">
            {product.category}
          </p>

          <h1
            className="text-lg md:text-5xl font-normal md:font-medium text-gray-900 uppercase tracking-widest md:tracking-tight mb-2 md:mb-4 leading-snug md:leading-tight"
            style={{ fontFamily: "var(--font-playfair)" }}
          >
            {product.name}
          </h1>

          <div className="flex items-center gap-2 mb-6">
            <span
              className={`text-base md:text-lg ${
                reviews.length > 0 ? "text-yellow-400" : "text-gray-300"
              }`}
            >
              {"★".repeat(
                Math.min(5, Math.max(0, Math.round(Number(avgRating)))),
              )}
              {"☆".repeat(
                5 - Math.min(5, Math.max(0, Math.round(Number(avgRating)))),
              )}
            </span>

            <button
              type="button"
              className="text-[10px] md:text-xs font-bold text-gray-400 border-b border-gray-400 cursor-pointer hover:text-black"
              onClick={() => {
                setActiveTab("reviews");
                document
                  .getElementById("tabs")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {avgRating} ({reviews.length} Değerlendirme)
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4 mb-6 md:mb-8">
            {hasPriceDiscount ? (
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
                  {displayBasePrice.toLocaleString("tr-TR")} ₺
                </p>
              </>
            ) : (
              <p className="text-4xl md:text-5xl font-black text-black tracking-tighter">
                {displayBasePrice.toLocaleString("tr-TR")} ₺
              </p>
            )}
          </div>

          {variants.length > 0 && (
            <div className="mb-6 max-w-[500px]">
              <label htmlFor="product-variant" className="mb-2 block text-xs font-black uppercase text-gray-500">
                Ürün seçeneği
              </label>
              <select
                id="product-variant"
                value={selectedVariantId ?? ""}
                onChange={(event) => setSelectedVariantId(Number(event.target.value) || null)}
                className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-sm font-bold outline-none focus:border-black"
              >
                <option value="">Seçiniz</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id} disabled={variant.stock <= 0}>
                    {Object.entries(variant.option_values)
                      .map(([name, value]) => `${name}: ${value}`)
                      .join(" / ")}
                    {variant.stock <= 0 ? " (Tükendi)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="hidden md:flex items-center gap-3 mt-4 w-full max-w-[500px]">
            {availableStock <= 0 ? (
              <button
                type="button"
                disabled
                className="flex-1 h-[54px] bg-gray-50 text-gray-400 rounded-[18px] font-black text-[13px] uppercase border border-gray-200 cursor-not-allowed"
              >
                TÜKENDİ
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => addProductToCart(true)}
                  className="flex-1 h-[54px] bg-white text-black border-[1.5px] border-black rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-50 transition-all flex items-center justify-center active:scale-95"
                >
                  ŞİMDİ AL
                </button>

                <button
                  type="button"
                  data-testid="add-to-cart-desktop"
                  onClick={() => addProductToCart(false)}
                  className="flex-1 h-[54px] bg-black text-white rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-800 transition-all shadow-md flex items-center justify-center active:scale-95"
                >
                  SEPETE EKLE
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`w-[54px] h-[54px] flex-shrink-0 border rounded-[18px] flex items-center justify-center transition-all shadow-sm active:scale-95 ${
                isFavorite
                  ? "bg-red-50 border-red-200 text-red-500"
                  : "bg-white border-gray-100 text-black hover:scale-105"
              }`}
              aria-label="Favori"
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

          <div id="tabs" className="mt-10 md:mt-12">
            <div className="flex gap-4 md:gap-6 border-b border-gray-200 mb-6 overflow-x-auto hide-scrollbar">
              <button
                type="button"
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
                type="button"
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
                type="button"
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
                          <div className="absolute w-full border-t border-gray-200" />
                          <button
                            type="button"
                            onClick={() => setIsDescExpanded(!isDescExpanded)}
                            className="relative z-10 bg-gray-50 hover:bg-white border border-gray-200 text-gray-800 text-[10px] md:text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 rounded-full flex items-center transition-all"
                          >
                            {isDescExpanded ? "Daralt" : "Tüm Özellikler"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      Açıklama bulunmuyor.
                    </p>
                  )}
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div>
                      <p className="text-2xl md:text-3xl font-black">
                        {avgRating}
                      </p>
                      <p className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {reviews.length} Yorum
                      </p>
                    </div>

                    {currentUser ? (
                      hasPurchased ? (
                        <button
                          type="button"
                          onClick={openReviewModal}
                          className="bg-black text-white px-4 md:px-6 py-2.5 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
                        >
                          Yorum Yap
                        </button>
                      ) : (
                        <p className="text-[10px] font-bold text-gray-400 max-w-[160px] text-right">
                          Yorum için ürünü satın almış olmalısınız.
                        </p>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={openReviewModal}
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
                      {reviews.map((review) => (
                        <div
                          key={review.id}
                          className="border-b border-gray-100 pb-4"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-yellow-400 text-xs md:text-sm">
                              {"★".repeat(Number(review.rating || 0))}
                              {"☆".repeat(5 - Number(review.rating || 0))}
                            </span>
                            <span className="text-[9px] md:text-[10px] font-bold text-gray-400 border-l border-gray-300 pl-2">
                              {new Date(
                                review.created_at || Date.now(),
                              ).toLocaleDateString("tr-TR")}
                            </span>
                          </div>

                          <p className="text-xs md:text-sm font-medium text-gray-700 mb-3">
                            {review.comment}
                          </p>

                          {review.images && review.images.length > 0 && (
                            <div className="flex gap-2 overflow-x-auto pb-2">
                              {review.images.map(
                                (img: string, index: number) => (
                                  <div
                                    key={index}
                                    className="w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border border-gray-200 relative shrink-0"
                                  >
                                    <Image
                                      src={img}
                                      fill
                                      sizes="64px"
                                      className="object-cover"
                                      alt="Yorum"
                                    />
                                  </div>
                                ),
                              )}
                            </div>
                          )}

                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                            {review.user_name}{" "}
                            <span className="text-green-600 ml-1">
                              ✓ Satın Aldı
                            </span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "qa" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] md:text-xs font-bold text-gray-500 w-2/3">
                      Satıcıya ürünle ilgili sorularınızı sorun.
                    </p>
                    <button
                      type="button"
                      onClick={openQuestionModal}
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
                      {questions.map((question) => (
                        <div
                          key={question.id}
                          className="bg-gray-50 p-4 rounded-2xl border border-gray-100"
                        >
                          <div className="mb-3">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                              Soru | {question.user_name}
                            </p>
                            <p className="text-xs md:text-sm font-bold text-black">
                              {question.question}
                            </p>
                          </div>

                          {question.answer ? (
                            <div className="pl-4 border-l-2 border-green-500">
                              <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-1">
                                Satıcı Cevabı
                              </p>
                              <p className="text-xs md:text-sm font-medium text-gray-700">
                                {question.answer}
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

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
            {availableStock <= 0 ? (
            <button
              type="button"
              disabled
              className="flex-1 py-3.5 bg-gray-100 text-gray-400 rounded-xl font-black text-xs uppercase tracking-widest border border-gray-200"
            >
              TÜKENDİ
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => addProductToCart(true)}
                className="flex-1 h-[54px] bg-white text-black border-[1.5px] border-black rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-50 transition-all flex items-center justify-center active:scale-95"
              >
                ŞİMDİ AL
              </button>

              <button
                type="button"
                data-testid="add-to-cart-mobile"
                onClick={() => addProductToCart(false)}
                className="flex-1 h-[54px] bg-black text-white rounded-[18px] font-black text-[13px] tracking-tight hover:bg-gray-800 transition-all shadow-md flex items-center justify-center active:scale-95"
              >
                SEPETE EKLE
              </button>
            </>
          )}
        </div>
      </div>

      {showAuthModal && (
        <ProductAuthModal
          message={authModalMessage}
          onClose={() => setShowAuthModal(false)}
          onLogin={() => router.push("/login")}
        />
      )}

      <ProductFeedbackDialogs
        reviewOpen={showReviewModal}
        questionOpen={showQuestionModal}
        rating={rating}
        comment={comment}
        question={questionText}
        previews={reviewPreviews}
        isSubmitting={isSubmitting}
        onReviewClose={() => setShowReviewModal(false)}
        onQuestionClose={() => setShowQuestionModal(false)}
        onRatingChange={setRating}
        onCommentChange={setComment}
        onQuestionChange={setQuestionText}
        onFilesChange={handleReviewFileChange}
        onReviewSubmit={submitReview}
        onQuestionSubmit={submitQuestion}
      />
    </div>
  );
}
