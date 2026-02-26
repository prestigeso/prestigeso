"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Yorumları çek (Ürün isimleriyle birlikte)
  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("*, products(name, image, images)")
      .order("created_at", { ascending: false });

    if (data) setReviews(data);
    if (error) console.error("Yorumlar çekilemedi:", error);
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // YORUMU ONAYLA (Sitede yayınla)
  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({ is_approved: true })
      .eq("id", id);

    if (!error) {
      alert("Yorum asilce yayına alındı! ✅");
      setReviews(reviews.map(r => r.id === id ? { ...r, is_approved: true } : r));
    } else {
      alert("Hata: " + error.message);
    }
  };

  // YORUMU REDDET / SİL
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bu yorumu tamamen silmek istediğinize emin misiniz?")) return;
    
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (!error) {
      setReviews(reviews.filter(r => r.id !== id));
    } else {
      alert("Hata: " + error.message);
    }
  };

  if (loading) return <div className="p-10 font-black uppercase text-gray-400 tracking-widest text-center">Yorumlar Yükleniyor...</div>;

  return (
    <div className="p-6 md:p-10 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-black uppercase tracking-tight text-black">⭐ Yorum & Değerlendirme Yönetimi</h1>
        <div className="text-xs font-bold text-gray-500 uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
          Toplam: {reviews.length} Yorum
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-gray-200">
          <span className="text-5xl opacity-50 mb-4 block">⭐</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-sm">Dükkanda henüz hiç yorum yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {reviews.map((rev) => {
            const product = rev.products;
            const productImage = product?.images?.[0] || product?.image || "/logo.jpeg";

            return (
              <div key={rev.id} className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-all ${rev.is_approved ? 'border-gray-100 hover:border-black' : 'border-orange-300 shadow-orange-100'}`}>
                
                {/* Durum Rozeti */}
                <div className="flex justify-between items-start mb-4">
                  {rev.is_approved ? (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Yayında
                    </span>
                  ) : (
                    <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 bg-orange-500 rounded-full"></span> Onay Bekliyor
                    </span>
                  )}
                  <span className="text-[10px] font-bold text-gray-400">{new Date(rev.created_at).toLocaleDateString("tr-TR")}</span>
                </div>

                {/* Ürün Bilgisi */}
                <div className="flex items-center gap-3 mb-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <img src={productImage} alt="" className="w-12 h-12 rounded-xl object-cover mix-blend-multiply" />
                  <div className="flex-1 truncate">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ürün</p>
                    <p className="text-xs font-bold text-black truncate">{product?.name || "Bilinmeyen Ürün"}</p>
                  </div>
                </div>

                {/* Yorum Detayı */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-black uppercase tracking-widest text-black">{rev.user_name}</p>
                    <span className="text-yellow-400 text-sm">{"★".repeat(rev.rating)}{"☆".repeat(5-rev.rating)}</span>
                  </div>
                  <p className="text-sm text-gray-600 font-medium bg-gray-50 p-4 rounded-2xl italic">"{rev.comment}"</p>
                </div>

                {/* Müşterinin Yüklediği Fotoğraflar (Varsa) */}
                {rev.images && rev.images.length > 0 && (
                  <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {rev.images.map((img: string, i: number) => (
                      <a href={img} target="_blank" rel="noreferrer" key={i}>
                        <img src={img} className="w-16 h-16 rounded-xl object-cover border border-gray-200 hover:scale-105 transition-transform" alt="Müşteri Fotosu" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Aksiyon Butonları */}
                <div className="flex gap-3 mt-auto pt-4 border-t border-gray-100">
                  {!rev.is_approved && (
                    <button 
                      onClick={() => handleApprove(rev.id)} 
                      className="flex-1 bg-black text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95"
                    >
                      Yayına Al ✅
                    </button>
                  )}
                  <button 
                    onClick={() => handleDelete(rev.id)} 
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