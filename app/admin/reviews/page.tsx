"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useAppAlert } from "@/context/AppAlertContext";
import type { ReviewRow } from "@/components/admin/types";

export default function AdminReviewsPage() {
  const { showToast, showConfirm } = useAppAlert();

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const fetchReviews = async () => {
    setLoading(true);

    const response = await fetch(
      `/api/admin/reviews?page=${page}&limit=${pageSize}`,
      {
        credentials: "include",
        cache: "no-store",
      },
    );
    const result = await response.json();
    if (response.ok) {
      setReviews(result.reviews || []);
      setTotal(Number(result.total || 0));
    } else showToast(result.error || "Yorumlar yüklenemedi.", "error");

    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApprove = async (id: string) => {
    const response = await fetch("/api/admin/reviews", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const result = await response.json();
    if (!response.ok) {
      showToast("Hata: " + (result.error || "Yorum güncellenemedi."), "error");
      return;
    }

    setReviews((prev) =>
      prev.map((review) =>
        review.id === id ? { ...review, is_approved: true } : review,
      ),
    );

    showToast("Yorum yayına alındı.", "success");
  };

  const handleDelete = async (id: string) => {
    const ok = await showConfirm({
      title: "Yorum silinsin mi?",
      message:
        "Bu yorumu tamamen silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
      tone: "danger",
    });

    if (!ok) return;

    const response = await fetch(
      `/api/admin/reviews?id=${encodeURIComponent(id)}`,
      { method: "DELETE", credentials: "include" },
    );
    const result = await response.json();
    if (!response.ok) {
      showToast("Hata: " + (result.error || "Yorum silinemedi."), "error");
      return;
    }

    setReviews((prev) => prev.filter((review) => review.id !== id));
    showToast("Yorum silindi.", "success");
  };

  if (loading) {
    return (
      <div className="p-10 font-black uppercase text-gray-400 tracking-widest text-center">
        Yorumlar Yükleniyor...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-black">
          ⭐ Yorum &amp; Değerlendirme Yönetimi
        </h1>

        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          Toplam: {total} Yorum
        </div>
      </div>

      {total > pageSize && (
        <nav
          className="mt-8 flex items-center justify-center gap-3"
          aria-label="Yorum sayfaları"
        >
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            className="px-5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-black disabled:opacity-40"
          >
            Önceki
          </button>
          <span className="text-xs font-bold text-gray-500">
            {page} / {Math.ceil(total / pageSize)}
          </span>
          <button
            type="button"
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage((value) => value + 1)}
            className="px-5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-black disabled:opacity-40"
          >
            Sonraki
          </button>
        </nav>
      )}

      {reviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
          <span className="text-5xl opacity-50 mb-4 block">⭐</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-sm">
            Dükkanda henüz hiç yorum yok.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {reviews.map((review) => {
            const product = review.products;
            const productImage =
              product?.images?.[0] || product?.image || "/logo.jpeg";

            return (
              <div
                key={review.id}
                className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-all ${
                  review.is_approved
                    ? "border-gray-100 hover:border-black"
                    : "border-orange-300 shadow-orange-100"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  {review.is_approved ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Yayında
                    </span>
                  ) : (
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                      Onay Bekliyor
                    </span>
                  )}

                  <span className="text-[10px] font-bold text-gray-400">
                    {new Date(review.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <Image
                    width={48}
                    height={48}
                    src={productImage}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover mix-blend-multiply"
                  />
                  <div className="flex-1 truncate">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      Ürün
                    </p>
                    <p className="text-xs font-bold text-black truncate">
                      {product?.name || "Bilinmeyen Ürün"}
                    </p>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-black uppercase tracking-widest text-black">
                      {review.user_name}
                    </p>
                    <span className="text-yellow-400 text-sm">
                      {"★".repeat(Number(review.rating || 0))}
                      {"☆".repeat(5 - Number(review.rating || 0))}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 font-medium bg-gray-50 p-4 rounded-2xl italic">
                    &quot;{review.comment}&quot;
                  </p>
                </div>

                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {review.images.map((img: string, index: number) => (
                      <a
                        href={img}
                        target="_blank"
                        rel="noreferrer"
                        key={index}
                      >
                        <Image
                          width={64}
                          height={64}
                          src={img}
                          className="w-16 h-16 rounded-xl object-cover border border-gray-200 hover:scale-105 transition-transform"
                          alt="Müşteri Fotosu"
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
                  {!review.is_approved && (
                    <button
                      type="button"
                      onClick={() => handleApprove(review.id)}
                      className="flex-1 bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95"
                    >
                      Yayına Al ✅
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(review.id)}
                    className="flex-1 bg-white border-2 border-red-100 text-red-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-all active:scale-95"
                  >
                    Sil 🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
