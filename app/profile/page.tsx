"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

// ALT BİLEŞENLERİ (COMPONENT) İÇERİ AKTARIYORUZ
import AddressesTab from "@/components/profile/AddressesTab";
import OrdersTab from "@/components/profile/OrdersTab";
import FavoritesTab from "@/components/profile/FavoritesTab";
import ReviewsTab from "@/components/profile/ReviewsTab";
import QuestionsTab from "@/components/profile/QuestionsTab";
import MessagesTab from "@/components/profile/MessagesTab";
import CouponsTab from "@/components/profile/CouponsTab";
import SettingsTab from "@/components/profile/SettingsTab";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [isMounted, setIsMounted] = useState(false);
  // Varsayılan sekme
  const [activeTab, setActiveTab] = useState("favorites");

  // STATELER (Veriler)
  const [favorites, setFavorites] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [myMessages, setMyMessages] = useState<any[]>([]);
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [myQuestions, setMyQuestions] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  // Mesaj Modalı Stateleri
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // BEYİN: TÜM VERİLERİ ÇEKME MOTORU
  useEffect(() => {
    const checkUserAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      // --- 1. FAVORİLERİ ÇEK ---
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select(`product_id, products (*)`)
        .eq("user_id", session.user.id);

      if (!favError && favData) {
        const dbFavs = favData.map((f: any) => f.products).filter(Boolean);
        const favIds = dbFavs.map((p: any) => p.id);

        if (favIds.length > 0) {
          const { data: productReviews } = await supabase
            .from("reviews")
            .select("product_id, rating")
            .in("product_id", favIds)
            .eq("is_approved", true);

          const favsWithStats = dbFavs.map((p: any) => {
            const pRevs = productReviews?.filter((r: any) => r.product_id === p.id) || [];
            const avg = pRevs.length > 0 ? pRevs.reduce((acc: number, r: any) => acc + r.rating, 0) / pRevs.length : 0;
            return { ...p, ratingAvg: avg, reviewCount: pRevs.length };
          });
          setFavorites(favsWithStats);
        } else {
          setFavorites(dbFavs);
        }
      }

      // --- GEÇMİŞ (Recently Viewed) ---
      try {
        const savedViewed = JSON.parse(localStorage.getItem("prestige_viewed") || "[]");
        setRecentlyViewed(savedViewed);
      } catch {
        setRecentlyViewed([]);
      }

      // --- 2. MESAJLAR ---
      const { data: mData } = await supabase.from("messages").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (mData) setMyMessages(mData);

      // --- 3. YORUMLAR ---
      const { data: revData } = await supabase.from("reviews").select("*, products(*)").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (revData) setMyReviews(revData);

      // --- 4. SORULAR ---
      const { data: qData } = await supabase.from("questions").select("*, products(*)").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (qData) setMyQuestions(qData);

      // --- 5. SİPARİŞLER ---
      const { data: ordData } = await supabase.from("orders").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (ordData) setMyOrders(ordData);

      // --- 6. ADRESLER ---
      const { data: addrData } = await supabase.from("addresses").select("*").eq("user_id", session.user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false });
      if (addrData) setAddresses(addrData);

      // YÜKLEME BİTTİ, EKRANI AÇ!
      setLoading(false);
    };

    checkUserAndLoadData();
  }, [router]);

  // FAVORİDEN ÇIKARMA FONKSİYONU
  const removeFavorite = async (productId: string) => {
    if (!user) return;
    const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId);
    if (!error) setFavorites(favorites.filter((item) => item.id !== productId));
  };

  // MESAJ GÖNDERME FONKSİYONU
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("messages").insert([{
        user_id: user.id,
        user_email: user.email,
        message: messageText,
        created_at: new Date().toISOString(),
      }]);

      if (error) throw error;

      alert("Mesajınız başarıyla iletildi! En kısa sürede dönüş sağlayacağız. 🖤");
      setMessageText("");
      setIsMessageModalOpen(false);

      // Listeyi yenile
      const { data: mData } = await supabase.from("messages").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (mData) setMyMessages(mData);
    } catch (err: any) {
      alert("Hata oluştu: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  // YÜKLENİYOR EKRANI
  if (!isMounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">
        Yükleniyor...
      </div>
    );
  }

  if (!user) return null;

  const profileCompletion = 85;

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-10 px-4 mt-16 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* SOL MENÜ */}
        <div className="w-full md:w-1/4 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
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

          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
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
              <span className="text-lg">⭐</span> Değerlendirmelerim ({myReviews.length})
            </button>
            <button onClick={() => setActiveTab("questions")} className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "questions" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <span className="text-lg">💬</span> Sorularım ({myQuestions.length})
            </button>
            <button onClick={() => setActiveTab("messages")} className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "messages" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <span className="text-lg">📧</span> Mesajlarım ({myMessages.length})
            </button>
            <button onClick={() => setActiveTab("settings")} className={`text-left p-4 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "settings" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}>
              <span className="text-lg">⚙️</span> Hesap Ayarlarım
            </button>
          </div>

          <button onClick={() => setIsMessageModalOpen(true)} className="w-full text-center bg-white p-4 rounded-3xl border border-gray-100 font-black text-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-3">
            <span>💬</span> Satıcıya Mesaj Gönder
          </button>

          <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="w-full text-center bg-white p-4 rounded-3xl border border-gray-100 font-bold text-red-500 text-sm hover:bg-red-50 transition-all shadow-sm mt-2">
            Güvenli Çıkış
          </button>
        </div>

        {/* SAĞ İÇERİK (SİHRİN OLDUĞU YER) */}
        <div className="w-full md:w-3/4 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[50vh]">
            {/* COMPONENTLERE VERİLERİ GÖNDERİYORUZ */}
            {activeTab === "orders" && <OrdersTab orders={myOrders} />}
            {activeTab === "favorites" && <FavoritesTab favorites={favorites} removeFavorite={removeFavorite} />}
            {activeTab === "addresses" && <AddressesTab user={user} addresses={addresses} setAddresses={setAddresses} />}
            {activeTab === "reviews" && <ReviewsTab reviews={myReviews} />}
            {activeTab === "questions" && <QuestionsTab questions={myQuestions} />}
            {activeTab === "messages" && <MessagesTab messages={myMessages} />}
            {activeTab === "coupons" && <CouponsTab />}
            {activeTab === "settings" && <SettingsTab user={user} />}
          </div>

          {/* GÖZ ATTIKLARIM */}
          {recentlyViewed.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-5">
              <h3 className="text-sm font-black uppercase tracking-tight mb-4 text-black border-l-4 border-black pl-3">
                Son Gezdikleriniz
              </h3>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {recentlyViewed.map((item: any) => {
                  const displayImage = item.images?.[0] || item.image || "/logo.jpeg";
                  const activePrice = Number(item.discount_price) > 0 ? Number(item.discount_price) : Number(item.price);
                  const ratingCount = item.reviewCount || 0;
                  const avgRating = item.ratingAvg || 0;

                  return (
                    <Link href={`/product/${item.id}`} key={item.id} className="min-w-[90px] w-[90px] md:min-w-[100px] md:w-[100px] snap-start group relative block cursor-pointer flex-shrink-0 border border-gray-100 p-1.5 rounded-xl hover:border-black transition-all bg-white">
                      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-50 relative mb-2">
                        <img src={displayImage} alt={item.name} className="h-full w-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out" />
                      </div>
                      <h4 className="font-bold text-[9px] uppercase truncate text-black">{item.name}</h4>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span className={`text-[8px] ${ratingCount > 0 ? "text-yellow-400" : "text-gray-300"}`}>
                          {"★".repeat(Math.round(avgRating))}{"☆".repeat(5 - Math.round(avgRating))}
                        </span>
                        <span className="text-[7px] font-bold text-gray-400">({ratingCount})</span>
                      </div>
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

      {/* MESAJ GÖNDER MODALI */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Satıcıya Mesaj Gönder</h2>
              <button onClick={() => setIsMessageModalOpen(false)} className="w-8 h-8 bg-gray-100 rounded-full font-bold">✕</button>
            </div>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Mesajınız</label>
                <textarea required rows={5} value={messageText} onChange={(e) => setMessageText(e.target.value)} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium resize-none outline-none focus:border-black transition-all" placeholder="Ürünler veya siparişler hakkında yazabilirsiniz..." />
              </div>
              <button type="submit" disabled={isSending} className="w-full bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-xl active:scale-95 transition-all">
                {isSending ? "Gönderiliyor..." : "Mesajı İlet 🚀"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}