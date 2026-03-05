"use client";

import type { ReviewRow } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;

  reviews: ReviewRow[];

  onApprove: (reviewId: string) => void;
  onDelete: (reviewId: string) => void;
};

export default function ReviewsModal({
  open,
  onClose,
  reviews,
  onApprove,
  onDelete,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <span>⭐</span> Yorum &amp; Değerlendirme Yönetimi
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto space-y-4 flex-1 pr-2">
          {reviews.length === 0 ? (
            <p className="text-center text-gray-400 font-bold py-20 uppercase tracking-widest text-sm">
              Dükkanda henüz hiç yorum yok.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((rev) => {
                const product = rev.products;
                const productImage =
                  product?.images?.[0] || product?.image || "/logo.jpeg";

                return (
                  <div
                    key={rev.id}
                    className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all flex flex-col ${
                      rev.is_approved ? "border-gray-100" : "border-orange-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      {rev.is_approved ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1">
                          ✅ Yayında
                        </span>
                      ) : (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 animate-pulse">
                          ⏳ Onay Bekliyor
                        </span>
                      )}

                      <span className="text-[9px] font-bold text-gray-400">
                        {new Date(rev.created_at).toLocaleDateString("tr-TR")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-4 bg-gray-50 p-2 rounded-xl">
                      <img
                        src={productImage}
                        alt=""
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 truncate">
                        <p className="text-[10px] font-bold text-black truncate">
                          {product?.name || "Bilinmeyen Ürün"}
                        </p>
                      </div>
                    </div>

                    <div className="mb-4 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                          {rev.user_name}
                        </p>
                        <span className="text-yellow-400 text-xs">
                          {"★".repeat(rev.rating)}
                          {"☆".repeat(5 - rev.rating)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 font-medium italic">
                        "{rev.comment}"
                      </p>
                    </div>

                    {rev.images && rev.images.length > 0 && (
                      <div className="flex gap-2 mb-4 overflow-x-auto">
                        {rev.images.map((img: string, i: number) => (
                          <a href={img} target="_blank" rel="noreferrer" key={i}>
                            <img
                              src={img}
                              className="w-12 h-12 rounded-lg object-cover border"
                              alt=""
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                      {!rev.is_approved && (
                        <button
                          type="button"
                          onClick={() => onApprove(rev.id)}
                          className="flex-1 bg-black text-white py-2 rounded-lg font-black text-[10px] uppercase"
                        >
                          Yayına Al
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDelete(rev.id)}
                        className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-black text-[10px] uppercase border border-red-100"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}