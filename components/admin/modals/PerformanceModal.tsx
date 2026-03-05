"use client";

import type { ProductRow } from "../types";

type Tab = "favorites" | "reviews" | "views";

type RankedItem = ProductRow & {
  count?: number; // favorites/views için
  ratingAvg?: number; // reviews için
  ratingCount?: number; // reviews için
};

type Props = {
  open: boolean;
  onClose: () => void;

  tab: Tab;
  setTab: (t: Tab) => void;

  favoritesRank: RankedItem[];
  reviewsRank: RankedItem[];
  viewsRank: RankedItem[];
};

export default function PerformanceModal({
  open,
  onClose,
  tab,
  setTab,
  favoritesRank,
  reviewsRank,
  viewsRank,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <span>📈</span> Performans Analizi
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

        <div className="flex gap-2 mb-6 bg-gray-50 p-2 rounded-2xl w-max">
          <button
            type="button"
            onClick={() => setTab("favorites")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === "favorites"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-200"
            }`}
          >
            ❤️ En Çok Favorilenenler
          </button>

          <button
            type="button"
            onClick={() => setTab("reviews")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === "reviews"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-200"
            }`}
          >
            ⭐ En Yüksek Puanlılar
          </button>

          <button
            type="button"
            onClick={() => setTab("views")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === "views"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-200"
            }`}
          >
            👁️ En Çok İncelenenler
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-2">
          {/* FAVORITES */}
          {tab === "favorites" &&
            (favoritesRank.length === 0 ? (
              <p className="text-center text-gray-400 py-10 font-bold uppercase text-xs">
                Henüz favoriye eklenen ürün yok.
              </p>
            ) : (
              <div className="space-y-3">
                {favoritesRank.map((p: any, i: number) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm"
                  >
                    <div className="w-8 text-center font-black text-xl text-gray-300">
                      #{i + 1}
                    </div>

                    <img
                      src={Array.isArray(p.images) ? p.images[0] : p.image || "/logo.jpeg"}
                      className="w-12 h-12 rounded-xl object-cover"
                      alt=""
                    />

                    <div className="flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {p.category}
                      </p>
                      <p className="font-bold text-sm text-black">{p.name}</p>
                    </div>

                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl flex items-center gap-2">
                      <span className="text-lg">❤️</span>
                      <span className="font-black text-lg">{p.count ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* REVIEWS */}
          {tab === "reviews" &&
            (reviewsRank.length === 0 ? (
              <p className="text-center text-gray-400 py-10 font-bold uppercase text-xs">
                Henüz değerlendirilen ürün yok.
              </p>
            ) : (
              <div className="space-y-3">
                {reviewsRank.map((p: any, i: number) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm"
                  >
                    <div className="w-8 text-center font-black text-xl text-gray-300">
                      #{i + 1}
                    </div>

                    <img
                      src={Array.isArray(p.images) ? p.images[0] : p.image || "/logo.jpeg"}
                      className="w-12 h-12 rounded-xl object-cover"
                      alt=""
                    />

                    <div className="flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {p.category}
                      </p>
                      <p className="font-bold text-sm text-black">{p.name}</p>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-yellow-400 text-lg tracking-widest">
                        {"★".repeat(Math.round(p.ratingAvg || 0))}
                      </span>
                      <p className="text-[10px] font-bold text-gray-500">
                        {(p.ratingAvg || 0).toFixed(1)} Puan ({p.ratingCount || 0} Yorum)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {/* VIEWS */}
          {tab === "views" &&
            (viewsRank.length === 0 ? (
              <p className="text-center text-gray-400 py-10 font-bold uppercase text-xs">
                Henüz incelenen ürün yok.
              </p>
            ) : (
              <div className="space-y-3">
                {viewsRank.map((p: any, i: number) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm"
                  >
                    <div className="w-8 text-center font-black text-xl text-gray-300">
                      #{i + 1}
                    </div>

                    <img
                      src={Array.isArray(p.images) ? p.images[0] : p.image || "/logo.jpeg"}
                      className="w-12 h-12 rounded-xl object-cover"
                      alt=""
                    />

                    <div className="flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {p.category}
                      </p>
                      <p className="font-bold text-sm text-black">{p.name}</p>
                    </div>

                    <div className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl flex items-center gap-2">
                      <span className="text-lg">👁️</span>
                      <span className="font-black text-lg">{p.count ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}