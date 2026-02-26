"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Varsayılan sekme
  const [activeTab, setActiveTab] = useState("favorites");
  
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      
      // 1. Tarayıcıdan Donuk Verileri (ID'leri) Çek
      const savedFavs = JSON.parse(localStorage.getItem("prestige_favorites") || "[]");
      const savedViewed = JSON.parse(localStorage.getItem("prestige_viewed") || "[]");

      // 2. Eğer ürün varsa, ID'lerini topla
      const favIds = savedFavs.map((item: any) => item.id);
      const viewedIds = savedViewed.map((item: any) => item.id);
      
      // Tüm benzersiz ID'leri birleştir
      const allIds = Array.from(new Set([...favIds, ...viewedIds]));

      if (allIds.length > 0) {
        // 3. Supabase'e gidip bu ID'lerin EN GÜNCEL halini çek!
        const { data: freshProducts, error } = await supabase
          .from("products")
          .select("*")
          .in("id", allIds);

        if (!error && freshProducts) {
          // Gelen taze verilerle favorileri güncelle
          const liveFavs = favIds.map((id: any) => freshProducts.find((p) => p.id === id)).filter(Boolean);
          const liveViewed = viewedIds.map((id: any) => freshProducts.find((p) => p.id === id)).filter(Boolean);

          setFavorites(liveFavs);
          setRecentlyViewed(liveViewed);

          // Tarayıcının hafızasını da bu taze fiyatlarla güncelle ki bir dahaki sefere hazır olsun
          localStorage.setItem("prestige_favorites", JSON.stringify(liveFavs));
          localStorage.setItem("prestige_viewed", JSON.stringify(liveViewed));
        } else {
          // Hata olursa en azından eski hallerini göster
          setFavorites(savedFavs);
          setRecentlyViewed(savedViewed);
        }
      } else {
        setFavorites([]);
        setRecentlyViewed([]);
      }

      setLoading(false);
    };

    checkUserAndLoadData();
  }, [router]);

  const removeFavorite = (productId: string) => {
    const newFavs = favorites.filter(item => item.id !== productId);
    setFavorites(newFavs);
    localStorage.setItem("prestige_favorites", JSON.stringify(newFavs));
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">Yükleniyor...</div>;
  if (!user) return null;

  const profileCompletion = 60;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 mt-16 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* SOL MENÜ */}
        <div className="w-full md:w-1/4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
               <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">👤</div>
               <div className="overflow-hidden">
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">PRESTİGESO ÜYESİ</p>
                 <h2 className="font-black text-sm uppercase truncate text-black">{user.email?.split("@")[0]}</h2>
               </div>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
               <div className="bg-black h-1.5 rounded-full" style={{ width: `${profileCompletion}%` }}></div>
            </div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Profilinin %{profileCompletion}'i Tamamlandı</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
            <button onClick={() => setActiveTab("orders")} className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "orders" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <span className="text-lg">📦</span> Siparişlerim
            </button>
            <button onClick={() => setActiveTab("favorites")} className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "favorites" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <span className="text-lg">❤️</span> Favorilerim ({favorites.length})
            </button>
            <button onClick={() => setActiveTab("addresses")} className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "addresses" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <span className="text-lg">📍</span> Kayıtlı Adreslerim
            </button>
            <button onClick={() => setActiveTab("coupons")} className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "coupons" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <span className="text-lg">🎟️</span> İndirim Kuponlarım
            </button>
            <button onClick={() => setActiveTab("reviews")} className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "reviews" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <span className="text-lg">⭐</span> Değerlendirmelerim
            </button>
            <button onClick={() => setActiveTab("settings")} className={`text-left p-4 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "settings" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <span className="text-lg">⚙️</span> Hesap Ayarlarım
            </button>
          </div>

          <div className="flex flex-col gap-2 mt-2">
             <a href="https://wa.me/905555555555" target="_blank" rel="noopener noreferrer" className="w-full text-center bg-green-50 p-4 rounded-2xl border border-green-100 font-bold text-green-700 text-sm hover:bg-green-100 transition-all flex items-center justify-center gap-2 shadow-sm">
               <span className="text-lg">🎧</span> WhatsApp Destek
             </a>
             <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="w-full text-center bg-white p-4 rounded-2xl border border-gray-100 font-bold text-red-500 text-sm hover:bg-red-50 transition-all shadow-sm">
               Güvenli Çıkış
             </button>
          </div>
        </div>

        {/* SAĞ İÇERİK */}
        <div className="w-full md:w-3/4 flex flex-col gap-6">
           <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 min-h-[50vh]">
             
             {/* FAVORİLERİM */}
             {activeTab === "favorites" && (
               <div className="animate-in fade-in duration-300">
                 <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">Favori Ürünlerim</h3>
                 {favorites.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                      <span className="text-4xl mb-4 opacity-50">❤️</span>
                      <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Favori listeniz şu an boş.</p>
                      <Link href="/shop" className="mt-6 bg-black text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all">Keşfetmeye Başla</Link>
                    </div>
                 ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                       {favorites.map((product) => {
                          const displayImage = product.images?.[0] || product.image || "/logo.jpeg";
                          
                          // İndirimli fiyat varsa onu göster, yoksa normal fiyatı göster (CANLI GÜNCELLEME)
                          const activePrice = Number(product.discount_price) > 0 ? Number(product.discount_price) : Number(product.price);

                          return (
                            <Link href={`/product/${product.id}`} key={product.id} className="group relative block w-full h-full flex flex-col cursor-pointer">
                               <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-gray-50 relative border border-gray-200 mb-3">
                                 <img src={displayImage} alt={product.name} className="h-full w-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700 ease-out" />
                                 
                                 {/* Eğer indirim varsa küçük bir etiket göster */}
                                 {Number(product.discount_price) > 0 && (
                                   <div className="absolute bottom-0 w-full bg-red-600 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest z-10">
                                     İndirimli
                                   </div>
                                 )}

                                 <button 
                                   onClick={(e) => { e.preventDefault(); removeFavorite(product.id); }} 
                                   className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-sm flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all z-10"
                                   title="Favorilerden Çıkar"
                                 >
                                   <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                                 </button>
                               </div>
                               <div className="px-1 flex-1 flex flex-col">
                                 <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-0.5 truncate">{product.category || "PRESTİGESO"}</p>
                                 <h4 className="font-bold text-xs uppercase truncate text-black mb-1">{product.name}</h4>
                                 <div className="flex items-end gap-2 mt-auto">
                                   <p className="text-sm font-black text-black">{activePrice.toLocaleString("tr-TR")} ₺</p>
                                   {/* Eski fiyatı üstü çizili göster */}
                                   {Number(product.discount_price) > 0 && (
                                      <p className="text-[10px] font-bold text-gray-400 line-through mb-0.5">{Number(product.price).toLocaleString("tr-TR")} ₺</p>
                                   )}
                                 </div>
                               </div>
                            </Link>
                          );
                       })}
                    </div>
                 )}
               </div>
             )}

             {/* SİPARİŞLERİM (İade uyarısı eklendi) */}
             {activeTab === "orders" && (
               <div className="animate-in fade-in duration-300">
                 <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-black">Tüm Siparişlerim</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b-2 border-gray-100 pb-4">
                   * İade ve iptal işlemlerinizi sipariş detaylarından gerçekleştirebilirsiniz.
                 </p>
                 <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   <span className="text-4xl mb-4 opacity-50">📦</span>
                   <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Henüz bir siparişiniz bulunmuyor.</p>
                 </div>
               </div>
             )}

             {/* KAYITLI ADRESLERİM */}
             {activeTab === "addresses" && (
               <div className="animate-in fade-in duration-300">
                 <div className="flex justify-between items-center mb-6 border-b-2 border-gray-100 pb-4">
                    <h3 className="text-xl font-black uppercase tracking-tight text-black">Kayıtlı Adreslerim</h3>
                    <button className="text-[10px] font-black uppercase tracking-widest text-black border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors">
                       + Yeni Adres Ekle
                    </button>
                 </div>
                 <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   <span className="text-4xl mb-4 opacity-50">📍</span>
                   <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Henüz kayıtlı bir adresiniz yok.</p>
                 </div>
               </div>
             )}

             {/* İNDİRİM KUPONLARIM */}
             {activeTab === "coupons" && (
               <div className="animate-in fade-in duration-300">
                 <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">İndirim Kuponlarım</h3>
                 <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 relative overflow-hidden">
                   <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200"></div>
                   <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200"></div>
                   <span className="text-4xl mb-4 opacity-50">🎟️</span>
                   <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Şu an aktif bir kuponunuz bulunmuyor.</p>
                 </div>
               </div>
             )}

             {/* DEĞERLENDİRMELERİM */}
             {activeTab === "reviews" && (
               <div className="animate-in fade-in duration-300">
                 <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">Değerlendirmelerim</h3>
                 <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                   <span className="text-4xl mb-4 opacity-50">⭐</span>
                   <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Henüz bir ürün değerlendirmesi yapmadınız.</p>
                 </div>
               </div>
             )}
             
             {/* HESAP AYARLARI */}
             {activeTab === "settings" && (
               <div className="animate-in fade-in duration-300">
                 <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">Hesap Ayarlarım</h3>
                 <div className="max-w-md space-y-4">
                   <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">E-Posta Adresi</label>
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm font-bold text-gray-500 cursor-not-allowed">
                        {user.email}
                      </div>
                   </div>
                   <button className="bg-black text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 transition-all w-full md:w-auto mt-4 shadow-md">
                      Bilgileri Güncelle
                   </button>
                 </div>
               </div>
             )}

           </div>

           {/* GÖZ ATTIKLARIM ALANI (Kartlar Küçültüldü) */}
           {recentlyViewed.length > 0 && (
             <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-5">
                <h3 className="text-sm font-black uppercase tracking-tight mb-4 text-black border-l-4 border-black pl-3">Son Gezdikleriniz</h3>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                   {recentlyViewed.map((item) => {
                      const displayImage = item.images?.[0] || item.image || "/logo.jpeg";
                      // Burada da canlı fiyat gösterimi eklendi
                      const activePrice = Number(item.discount_price) > 0 ? Number(item.discount_price) : Number(item.price);

                      return (
                        <Link href={`/product/${item.id}`} key={item.id} className="min-w-[90px] w-[90px] md:min-w-[100px] md:w-[100px] snap-start group relative block cursor-pointer flex-shrink-0">
                           <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-gray-50 relative border border-gray-100 mb-2">
                             <img src={displayImage} alt={item.name} className="h-full w-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out" />
                           </div>
                           <h4 className="font-bold text-[9px] uppercase truncate text-black">{item.name}</h4>
                           <div className="flex items-end gap-1 mt-0.5">
                             <p className="text-[10px] font-black text-black">{activePrice.toLocaleString("tr-TR")} ₺</p>
                           </div>
                        </Link>
                      );
                   })}
                </div>
             </div>
           )}

        </div>
      </div>
    </div>
  );
}