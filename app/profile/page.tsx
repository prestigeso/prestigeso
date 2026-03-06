"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import AddressesTab from "@/components/profile/AddressesTab";
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Varsayılan sekme
  const [activeTab, setActiveTab] = useState("favorites");

  const [favorites, setFavorites] = useState<any[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<any[]>([]);
  const [myMessages, setMyMessages] = useState<any[]>([]);

  // Yorumlar ve Sorular Stateleri
  const [myReviews, setMyReviews] = useState<any[]>([]);
  const [myQuestions, setMyQuestions] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);

  // EKLENEN: Mesaj Kutusu Stateleri
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  useEffect(() => {
    const checkUserAndLoadData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      // --- 1. FAVORİLERİ VERİTABANINDAN ÇEK (YENİ SİSTEM) ---
      const { data: favData, error: favError } = await supabase
        .from("favorites")
        .select(`product_id, products (*)`)
        .eq("user_id", session.user.id);

      if (!favError && favData) {
        const dbFavs = favData.map((f: any) => f.products).filter(Boolean);
        const favIds = dbFavs.map((p: any) => p.id);

        if (favIds.length > 0) {
          // Bu ürünlere ait onaylanmış yorumları çek
          const { data: productReviews } = await supabase
            .from("reviews")
            .select("product_id, rating")
            .in("product_id", favIds)
            .eq("is_approved", true);

          const favsWithStats = dbFavs.map((p: any) => {
            const pRevs =
              productReviews?.filter((r: any) => r.product_id === p.id) || [];
            const avg =
              pRevs.length > 0
                ? pRevs.reduce((acc: number, r: any) => acc + r.rating, 0) /
                  pRevs.length
                : 0;
            return { ...p, ratingAvg: avg, reviewCount: pRevs.length };
          });

          setFavorites(favsWithStats);
        } else {
          setFavorites(dbFavs);
        }
      }

      // Geçmiş (Recently Viewed) localStorage (Cihaza özel)
      try {
        const savedViewed = JSON.parse(
          localStorage.getItem("prestige_viewed") || "[]"
        );
        setRecentlyViewed(savedViewed);
      } catch {
        setRecentlyViewed([]);
      }

      // 2. Mesajlar, Siparişler ve Diğer Veriler
      // MESAJLAR
      const { data: mData } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (mData) setMyMessages(mData);

      // YORUMLAR
      const { data: revData } = await supabase
        .from("reviews")
        .select("*, products(*)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (revData) setMyReviews(revData);

      // SORULAR
      const { data: qData } = await supabase
        .from("questions")
        .select("*, products(*)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (qData) setMyQuestions(qData);

      // SİPARİŞLER
      const { data: ordData } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (ordData) setMyOrders(ordData);

      // YENİ: ADRESLERİ ÇEK
      const { data: addrData } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", session.user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (addrData) setAddresses(addrData);

      setLoading(false);
    };

    checkUserAndLoadData();
  }, [router]);

  // FAVORİDEN ÇIKARMA (VERİTABANINDAN)
  const removeFavorite = async (productId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", productId);

    if (!error) setFavorites(favorites.filter((item) => item.id !== productId));
  };

  // EKLENEN: Mesaj Gönderme Fonksiyonu
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;

    setIsSending(true);

    try {
      const { error } = await supabase.from("messages").insert([
        {
          user_id: user.id,
          user_email: user.email,
          message: messageText,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      alert("Mesajınız başarıyla iletildi! En kısa sürede dönüş sağlayacağız. 🖤");

      setMessageText("");
      setIsMessageModalOpen(false);

      // Mesaj gönderildikten sonra listeyi yenile
      const { data: mData } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (mData) setMyMessages(mData);
    } catch (err: any) {
      alert("Hata oluştu: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">
        Yükleniyor...
      </div>
    );

  if (!user) return null;

  const profileCompletion = 85;

  const formatAddress = (addr: any) => {
    if (!addr) return "";

    let obj = addr;
    if (typeof addr === "string") {
      try {
        obj = JSON.parse(addr);
      } catch {
        return addr;
      }
    }

    if (typeof obj === "object") {
      const parts: string[] = [];

      const fullName = [obj.firstName, obj.lastName].filter(Boolean).join(" ");
      if (fullName) parts.push(fullName);

      if (obj.phone) parts.push(obj.phone);

      const line =
        obj.address ||
        obj.street ||
        obj.addressLine ||
        obj.line ||
        obj.detail ||
        "";
      if (line) parts.push(line);

      const cityLine = [obj.district, obj.city].filter(Boolean).join(" / ");
      if (cityLine) parts.push(cityLine);

      if (obj.zip || obj.postalCode) parts.push(obj.zip || obj.postalCode);

      return parts.join(" • ");
    }

    return String(addr);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 mt-16 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        {/* SOL MENÜ */}
        <div className="w-full md:w-1/4 flex flex-col gap-4">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                👤
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">
                  PRESTİGESO ÜYESİ
                </p>
                <h2 className="font-black text-sm uppercase truncate text-black">
                  {user.email?.split("@")[0]}
                </h2>
              </div>
            </div>

            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
              <div
                className="bg-black h-1.5 rounded-full"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>

            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">
              Profilinin %{profileCompletion}'i Tamamlandı
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
            <button
              onClick={() => setActiveTab("orders")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${
                activeTab === "orders"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">📦</span> Siparişlerim
            </button>

            <button
              onClick={() => setActiveTab("favorites")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${
                activeTab === "favorites"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">❤️</span> Favorilerim ({favorites.length})
            </button>

            <button
              onClick={() => setActiveTab("addresses")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${
                activeTab === "addresses"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">📍</span> Kayıtlı Adreslerim
            </button>

            <button
              onClick={() => setActiveTab("coupons")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${
                activeTab === "coupons"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">🎟️</span> İndirim Kuponlarım
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${
                activeTab === "reviews"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">⭐</span> Değerlendirmelerim ({myReviews.length})
            </button>

            <button
              onClick={() => setActiveTab("questions")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${
                activeTab === "questions"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">💬</span> Sorularım ({myQuestions.length})
            </button>

            <button
              onClick={() => setActiveTab("messages")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${
                activeTab === "messages"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">📧</span> Mesajlarım ({myMessages.length})
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`text-left p-4 font-bold text-sm transition-all flex items-center gap-3 ${
                activeTab === "settings"
                  ? "bg-black text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="text-lg">⚙️</span> Hesap Ayarlarım
            </button>
          </div>

          {/* Satıcıya Mesaj Gönder */}
          <button
            onClick={() => setIsMessageModalOpen(true)}
            className="w-full text-center bg-white p-4 rounded-2xl border border-gray-100 font-black text-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-3"
          >
            <span>💬</span> Satıcıya Mesaj Gönder
          </button>

          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() =>
                supabase.auth.signOut().then(() => router.push("/login"))
              }
              className="w-full text-center bg-white p-4 rounded-2xl border border-gray-100 font-bold text-red-500 text-sm hover:bg-red-50 transition-all shadow-sm"
            >
              Güvenli Çıkış
            </button>
          </div>
        </div>

        {/* SAĞ İÇERİK */}
        <div className="w-full md:w-3/4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 min-h-[50vh]">
            {/* MESAJLARIM */}
            {activeTab === "messages" && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-black uppercase mb-6 text-black border-b-2 border-gray-100 pb-4">
                  Destek Mesajlarım
                </h3>

                {myMessages.length === 0 ? (
                  <div className="py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <span className="text-4xl mb-4 opacity-50">📧</span>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-4">
                      Henüz mesajınız yok.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myMessages.map((m) => (
                      <div
                        key={m.id}
                        className="bg-white border border-gray-100 p-5 rounded-3xl shadow-sm"
                      >
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">
                          Mesajınız -{" "}
                          {new Date(m.created_at).toLocaleDateString("tr-TR")}
                        </p>
                        <p className="text-sm font-bold text-black">{m.message}</p>

                        {m.answer ? (
                          <div className="pl-4 border-l-2 border-green-500 bg-green-50/30 p-3 rounded-r-2xl mt-4">
                            <p className="text-[10px] font-black text-green-700 uppercase mb-1">
                              PrestigeSO Cevabı
                            </p>
                            <p className="text-sm font-medium text-gray-700">
                              {m.answer}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-4 flex items-center gap-2 text-orange-500 bg-orange-50 w-max px-3 py-1 rounded-full">
                            <span className="animate-pulse">⏳</span>
                            <p className="text-[10px] font-black uppercase">
                              Cevap Bekleniyor...
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* SORULARIM */}
            {activeTab === "questions" && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
                  Ürün Sorularım
                </h3>

                {myQuestions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <span className="text-4xl mb-4 opacity-50">💬</span>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
                      Satıcılara henüz soru sormadınız.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myQuestions.map((q) => {
                      const prod = q.products;
                      const displayImage = prod?.images?.[0] || prod?.image || "/logo.jpeg";

                      return (
                        <div
                          key={q.id}
                          className="bg-white border border-gray-200 p-4 rounded-2xl flex flex-col md:flex-row gap-4 shadow-sm"
                        >
                          <Link
                            href={`/product/${q.product_id}`}
                            className="w-full md:w-20 h-20 bg-gray-50 rounded-xl border border-gray-100 flex-shrink-0 overflow-hidden group"
                          >
                            <img
                              src={displayImage}
                              alt=""
                              className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform"
                            />
                          </Link>

                          <div className="flex-1">
                            <h4 className="font-bold text-xs text-gray-500 mb-2 truncate">
                              {prod?.name || "Bilinmeyen Ürün"}
                            </h4>

                            <div className="mb-3">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Sorunuz:
                              </p>
                              <p className="text-sm font-bold text-black">{q.question}</p>
                            </div>

                            {q.answer ? (
                              <div className="pl-4 border-l-2 border-green-500 bg-green-50/50 p-2 rounded-r-xl">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                                    Satıcı Cevabı
                                  </p>
                                  <span className="text-[9px] text-gray-400 font-bold">
                                    {q.answered_at
                                      ? new Date(q.answered_at).toLocaleDateString("tr-TR")
                                      : ""}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-gray-700">{q.answer}</p>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg border border-orange-100">
                                <span className="animate-pulse">⏳</span>
                                <p className="text-[10px] font-black uppercase tracking-widest">
                                  Satıcı Cevabı Bekleniyor...
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DEĞERLENDİRMELERİM */}
            {activeTab === "reviews" && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
                  Değerlendirmelerim
                </h3>

                {myReviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <span className="text-4xl mb-4 opacity-50">⭐</span>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
                      Henüz bir ürün değerlendirmesi yapmadınız.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myReviews.map((rev) => {
                      const prod = rev.products;
                      const displayImage = prod?.images?.[0] || prod?.image || "/logo.jpeg";

                      return (
                        <div
                          key={rev.id}
                          className="bg-gray-50 border border-gray-100 p-4 rounded-2xl flex flex-col md:flex-row gap-4"
                        >
                          <Link
                            href={`/product/${rev.product_id}`}
                            className="w-full md:w-24 h-24 bg-white rounded-xl border border-gray-200 flex-shrink-0 overflow-hidden group"
                          >
                            <img
                              src={displayImage}
                              alt=""
                              className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform"
                            />
                          </Link>

                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-sm text-black">
                                {prod?.name || "Bilinmeyen Ürün"}
                              </h4>
                              {rev.is_approved ? (
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                  Yayında
                                </span>
                              ) : (
                                <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                  Onay Bekliyor
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-yellow-400 text-xs">
                                {"★".repeat(rev.rating)}
                                {"☆".repeat(5 - rev.rating)}
                              </span>
                              <span className="text-[9px] font-bold text-gray-400">
                                {new Date(rev.created_at).toLocaleDateString("tr-TR")}
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 font-medium mb-3">{rev.comment}</p>

                            {rev.images && rev.images.length > 0 && (
                              <div className="flex gap-2">
                                {rev.images.map((img: string, i: number) => (
                                  <img
                                    key={i}
                                    src={img}
                                    className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                                    alt="Yorum foto"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* FAVORİLERİM */}
            {activeTab === "favorites" && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
                  Favori Ürünlerim
                </h3>

                {favorites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <span className="text-4xl mb-4 opacity-50">❤️</span>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
                      Favori listeniz şu an boş.
                    </p>
                    <Link
                      href="/shop"
                      className="mt-6 bg-black text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all"
                    >
                      Keşfetmeye Başla
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {favorites.map((product) => {
                      const displayImage = product.images?.[0] || product.image || "/logo.jpeg";
                      const activePrice =
                        Number(product.discount_price) > 0
                          ? Number(product.discount_price)
                          : Number(product.price);

                      const ratingCount = product.reviewCount || 0;
                      const avgRating = product.ratingAvg || 0;

                      return (
                        <Link
                          href={`/product/${product.id}`}
                          key={product.id}
                          className="group relative block w-full h-full flex flex-col cursor-pointer border border-gray-100 p-2 rounded-2xl hover:border-black transition-all bg-white"
                        >
                          <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-50 relative mb-3">
                            <img
                              src={displayImage}
                              alt={product.name}
                              className="h-full w-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-700 ease-out"
                            />

                            {Number(product.discount_price) > 0 && (
                              <div className="absolute bottom-0 w-full bg-red-600 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest z-10">
                                İndirimli
                              </div>
                            )}

                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                removeFavorite(product.id);
                              }}
                              className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-sm flex items-center justify-center text-black hover:scale-110 active:scale-95 transition-all z-10"
                              title="Favorilerden Çıkar"
                            >
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                            </button>
                          </div>

                          <div className="px-1 flex-1 flex flex-col">
                            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-0.5 truncate">
                              {product.category || "PRESTİGESO"}
                            </p>
                            <h4 className="font-bold text-xs uppercase truncate text-black mb-1">
                              {product.name}
                            </h4>

                            <div className="flex items-center gap-1 mb-2 mt-auto">
                              <span className={`text-[10px] ${ratingCount > 0 ? "text-yellow-400" : "text-gray-300"}`}>
                                {"★".repeat(Math.round(avgRating))}
                                {"☆".repeat(5 - Math.round(avgRating))}
                              </span>
                              <span className="text-[9px] font-bold text-gray-400">
                                ({ratingCount})
                              </span>
                            </div>

                            <div className="flex items-end gap-2">
                              <p className="text-sm font-black text-black">
                                {activePrice.toLocaleString("tr-TR")} ₺
                              </p>
                              {Number(product.discount_price) > 0 && (
                                <p className="text-[10px] font-bold text-gray-400 line-through mb-0.5">
                                  {Number(product.price).toLocaleString("tr-TR")} ₺
                                </p>
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

            {/* SİPARİŞLERİM */}
            {activeTab === "orders" && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-black">
                  Tüm Siparişlerim
                </h3>

                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b-2 border-gray-100 pb-4">
                  * İade ve iptal işlemlerinizi sipariş detaylarından gerçekleştirebilirsiniz.
                </p>

                {myOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <span className="text-4xl mb-4 opacity-50">📦</span>
                    <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
                      Henüz bir siparişiniz bulunmuyor.
                    </p>
                    <Link
                      href="/shop"
                      className="mt-6 bg-black text-white px-8 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all"
                    >
                      Alışverişe Başla
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden transition-all hover:border-black"
                      >
                        {/* YENİ NESİL ÜST BİLGİ ALANI */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-50 pb-4 gap-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Sipariş No:
                              </p>
                              <span className="bg-gray-100 text-black px-2 py-0.5 rounded text-[10px] font-black tracking-widest font-mono">
                                {order.order_no || `PRS-ESKI-${order.id}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                Tarih:
                              </p>
                              <p className="text-xs font-bold text-black">
                                {new Date(order.created_at).toLocaleDateString("tr-TR")}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2
                                ${
                                  order.status === "Bekliyor"
                                    ? "bg-orange-50 text-orange-600"
                                    : order.status === "Hazırlanıyor"
                                    ? "bg-blue-50 text-blue-600"
                                    : "bg-green-50 text-green-600"
                                }`}
                            >
                              {order.status === "Bekliyor" && <span className="animate-pulse">⏳</span>}
                              {order.status === "Hazırlanıyor" && <span>📦</span>}
                              {order.status === "Kargolandı" && <span>🚀</span>}
                              {order.status === "Teslim Edildi" && <span>✅</span>}
                              {order.status}
                            </span>
                          </div>
                        </div>

                        {/* KARGO TAKİP ALANI (Eğer girilmişse) */}
                        {(order.shipping_carrier || order.tracking_number) && (
                          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-lg">
                                🚚
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-0.5">
                                  Kargo Firması
                                </p>
                                <p className="text-sm font-bold text-black">{order.shipping_carrier || "Belirtilmedi"}</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div>
                                <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-0.5 text-right">
                                  Takip Numarası
                                </p>
                                <p className="text-sm font-bold font-mono text-black text-right">{order.tracking_number || "Bekleniyor..."}</p>
                              </div>
                              {order.tracking_number && (
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(order.tracking_number);
                                    alert("Kargo takip numarası kopyalandı! 📋");
                                  }}
                                  className="w-10 h-10 bg-white border border-blue-200 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm flex items-center justify-center font-bold active:scale-95"
                                  title="Kopyala"
                                >
                                  ⎘
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* SİPARİŞ İÇERİĞİ VE ADRES */}
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="flex-1 space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                              Ürünler
                            </p>

                            {(order.items || []).map((item: any, idx: number) => {
                              const displayImage =
                                item.images?.[0] || item.image || "/logo.jpeg";
                              const itemPrice =
                                Number(item.discount_price) > 0
                                  ? Number(item.discount_price)
                                  : Number(item.price);

                              return (
                                <div
                                  key={idx}
                                  className="flex gap-4 items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-50"
                                >
                                  <img
                                    src={displayImage}
                                    alt=""
                                    className="w-14 h-14 object-cover rounded-xl border border-gray-100 bg-white"
                                  />
                                  <div>
                                    <Link
                                      href={`/product/${item.id}`}
                                      className="text-xs font-bold uppercase text-black line-clamp-1 hover:underline"
                                    >
                                      {item.name}
                                    </Link>
                                    <p className="text-[10px] font-black text-gray-500 mt-0.5">
                                      {item.quantity || 1} Adet x{" "}
                                      {itemPrice.toLocaleString("tr-TR")} ₺
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="w-full md:w-1/3 bg-gray-50 rounded-2xl p-5 flex flex-col justify-between border border-gray-100">
                            <div>
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Teslimat Adresi
                              </p>
                              <p className="text-xs font-medium text-gray-700 line-clamp-3">
                                {formatAddress(order.shipping_address)}
                              </p>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                Toplam Ödenen Tutar
                              </p>
                              <p className="text-2xl font-black text-black">
                                {Number(order.total_amount).toLocaleString("tr-TR")} ₺
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADRESLERİM */}
            {activeTab === "addresses" && (
              <AddressesTab user={user} addresses={addresses} setAddresses={setAddresses} />
            )}

            {/* KUPONLARIM */}
            {activeTab === "coupons" && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
                  İndirim Kuponlarım
                </h3>

                <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200 relative overflow-hidden">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200"></div>
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full border border-gray-200"></div>
                  <span className="text-4xl mb-4 opacity-50">🎟️</span>
                  <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
                    Şu an aktif bir kuponunuz bulunmuyor.
                  </p>
                </div>
              </div>
            )}

            {/* AYARLAR */}
            {activeTab === "settings" && (
              <div className="animate-in fade-in duration-300">
                <h3 className="text-xl font-black uppercase tracking-tight mb-6 text-black border-b-2 border-gray-100 pb-4">
                  Hesap Ayarlarım
                </h3>

                <div className="max-w-md space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                      E-Posta Adresi
                    </label>
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

          {/* GÖZ ATTIKLARIM */}
          {recentlyViewed.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-5">
              <h3 className="text-sm font-black uppercase tracking-tight mb-4 text-black border-l-4 border-black pl-3">
                Son Gezdikleriniz
              </h3>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {recentlyViewed.map((item: any) => {
                  const displayImage =
                    item.images?.[0] || item.image || "/logo.jpeg";

                  const activePrice =
                    Number(item.discount_price) > 0
                      ? Number(item.discount_price)
                      : Number(item.price);

                  const ratingCount = item.reviewCount || 0;
                  const avgRating = item.ratingAvg || 0;

                  return (
                    <Link
                      href={`/product/${item.id}`}
                      key={item.id}
                      className="min-w-[90px] w-[90px] md:min-w-[100px] md:w-[100px] snap-start group relative block cursor-pointer flex-shrink-0 border border-gray-100 p-1.5 rounded-xl hover:border-black transition-all bg-white"
                    >
                      <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-50 relative mb-2">
                        <img
                          src={displayImage}
                          alt={item.name}
                          className="h-full w-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out"
                        />
                      </div>

                      <h4 className="font-bold text-[9px] uppercase truncate text-black">
                        {item.name}
                      </h4>

                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span
                          className={`text-[8px] ${
                            ratingCount > 0 ? "text-yellow-400" : "text-gray-300"
                          }`}
                        >
                          {"★".repeat(Math.round(avgRating))}
                          {"☆".repeat(5 - Math.round(avgRating))}
                        </span>
                        <span className="text-[7px] font-bold text-gray-400">
                          ({ratingCount})
                        </span>
                      </div>

                      <div className="flex items-end gap-1 mt-0.5">
                        <p className="text-[10px] font-black text-black">
                          {activePrice.toLocaleString("tr-TR")} ₺
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mesaj Gönder Modalı */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">
                Satıcıya Mesaj Gönder
              </h2>
              <button
                onClick={() => setIsMessageModalOpen(false)}
                className="w-8 h-8 bg-gray-100 rounded-full font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Mesajınız
                </label>
                <textarea
                  required
                  rows={5}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium resize-none outline-none focus:border-black transition-all"
                  placeholder="Ürünler veya siparişler hakkında yazabilirsiniz..."
                />
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="w-full bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest disabled:opacity-50 shadow-xl active:scale-95 transition-all"
              >
                {isSending ? "Gönderiliyor..." : "Mesajı İlet 🚀"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}