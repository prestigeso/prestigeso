"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";
import { useCart } from "@/context/CartContext";
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from "@/lib/browserStorage";
import type {
  AuthUser,
  CustomerProfile,
  FavoriteProduct,
  Order,
  Address,
  Review,
  Question,
  Message,
} from "@/types";

import AddressesTab from "@/components/profile/AddressesTab";
import OrdersTab from "@/components/profile/OrdersTab";
import FavoritesTab from "@/components/profile/FavoritesTab";
import ReviewsTab from "@/components/profile/ReviewsTab";
import QuestionsTab from "@/components/profile/QuestionsTab";
import MessagesTab from "@/components/profile/MessagesTab";
import CouponsTab from "@/components/profile/CouponsTab";
import SettingsTab from "@/components/profile/SettingsTab";

const VALID_PROFILE_TABS = [
  "orders",
  "favorites",
  "addresses",
  "coupons",
  "reviews",
  "questions",
  "messages",
  "settings",
];

function getDisplayName(
  user: AuthUser | null,
  customerProfile?: CustomerProfile | null,
) {
  const dbFullName = (customerProfile?.full_name || "").toString().trim();
  if (dbFullName) return dbFullName;

  const dbName = [customerProfile?.first_name, customerProfile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (dbName) return dbName;

  const metadata = user?.user_metadata || {};
  const metadataFullName = (metadata.full_name || "").toString().trim();
  if (metadataFullName) return metadataFullName;

  const metadataName = [
    metadata.first_name || metadata.firstName,
    metadata.last_name || metadata.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (metadataName) return metadataName;

  return user?.email?.split("@")[0] || "Müşteri";
}

export default function ProfilePage() {
  const router = useRouter();
  const { showToast } = useAppAlert();
  const { clearCart } = useCart();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("orders");

  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<FavoriteProduct[]>([]);
  const [myMessages, setMyMessages] = useState<Message[]>([]);
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [myQuestions, setMyQuestions] = useState<Question[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    try {
      const savedTab = safeStorageGet("local", "prestigeso_profile_tab");
      if (savedTab && VALID_PROFILE_TABS.includes(savedTab))
        setActiveTab(savedTab);
    } catch {
      setActiveTab("orders");
    }
  }, []);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    try {
      safeStorageSet("local", "prestigeso_profile_tab", tab);
    } catch (error) {
      console.warn("Profil sekmesi tercihi kaydedilemedi:", error);
    }
  };

  useEffect(() => {
    const checkUserAndLoadData = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      const { data: customerData } = await supabase
        .from("customers")
        .select(
          "id, email, first_name, last_name, full_name, phone, gender, birth_date, marketing_consent, marketing_consent_at, marketing_consent_revoked_at, marketing_consent_version",
        )
        .eq("id", session.user.id)
        .maybeSingle();

      if (customerData) setCustomerProfile(customerData);

      // PERF-03: Tüm sorguları paralel çalıştır
      const [
        favResult,
        messagesResult,
        reviewsResult,
        questionsResult,
        ordersResult,
        addressesResult,
      ] = await Promise.all([
        supabase
          .from("favorites")
          .select("product_id, products (*)")
          .eq("user_id", session.user.id)
          .limit(100),
        supabase
          .from("messages")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("my_product_reviews")
          .select(
            "id,product_id,rating,comment,user_name,images,is_approved,created_at,products",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("my_product_questions")
          .select(
            "id,product_id,question,user_name,answer,is_approved,answered_at,created_at,products",
          )
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", session.user.id)
          .in("payment_status", ["paid", "partially_refunded", "refunded"])
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("addresses")
          .select("*")
          .eq("user_id", session.user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      // Favorites
      if (!favResult.error && favResult.data) {
        const dbFavs = favResult.data
          .map((f: Record<string, unknown>) => f.products)
          .filter(Boolean) as FavoriteProduct[];
        const favIds = dbFavs.map((p) => p.id);

        if (favIds.length > 0) {
          const { data: productReviews } = await supabase
            .from("product_review_stats")
            .select("product_id,rating_avg,review_count")
            .in("product_id", favIds)
            .limit(500);

          const favsWithStats = dbFavs.map((p) => {
            const stats = productReviews?.find(
              (row) => String(row.product_id) === String(p.id),
            );
            return {
              ...p,
              ratingAvg: Number(stats?.rating_avg || 0),
              reviewCount: Number(stats?.review_count || 0),
            };
          });

          setFavorites(favsWithStats);
        } else {
          setFavorites(dbFavs);
        }
      }

      try {
        const savedViewed = JSON.parse(
          safeStorageGet("local", "prestige_viewed") || "[]",
        );
        setRecentlyViewed(Array.isArray(savedViewed) ? savedViewed : []);
      } catch {
        setRecentlyViewed([]);
      }

      if (messagesResult.data) setMyMessages(messagesResult.data);
      if (reviewsResult.data)
        setMyReviews(reviewsResult.data as unknown as Review[]);
      if (questionsResult.data)
        setMyQuestions(questionsResult.data as unknown as Question[]);
      if (ordersResult.data)
        setMyOrders(ordersResult.data as unknown as Order[]);
      if (addressesResult.data) setAddresses(addressesResult.data);

      setLoading(false);
    };

    checkUserAndLoadData();
  }, [router]);

  const removeFavorite = async (productId: number | string) => {
    if (!user) return;

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", Number(productId));

    if (error) {
      showToast("Favorilerden kaldırılırken bir hata oluştu.", "error");
      return;
    }

    setFavorites((prev) =>
      prev.filter((item) => String(item.id) !== String(productId)),
    );
    showToast("Ürün favorilerden kaldırıldı.", "success");
  };

  const handleSendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!messageText.trim() || !user) {
      showToast("Lütfen mesajınızı yazın.", "warning");
      return;
    }

    setIsSending(true);

    try {
      const { error } = await supabase.from("messages").insert([
        {
          user_id: user.id,
          user_email: user.email || customerProfile?.email || "",
          message: messageText,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      showToast(
        "Mesajınız başarıyla iletildi. En kısa sürede dönüş sağlayacağız.",
        "success",
      );
      setMessageText("");
      setIsMessageModalOpen(false);

      const { data: mData } = await supabase
        .from("messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (mData) setMyMessages(mData);
    } catch (err: unknown) {
      showToast(
        "Hata oluştu: " +
          (err instanceof Error ? err.message : "Bilinmeyen hata"),
        "error",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleOrderAction = async (
    orderId: number,
    action: "cancel" | "return",
    details?: {
      reason: string;
      items: Array<{ id: number; variant_id?: number; quantity: number }>;
      evidenceUrls?: string[];
    },
  ) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token)
        throw new Error("Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.");
      const response = await fetch("/api/orders/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ orderId, action, ...details }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Sipariş işlemi başarısız.");
      const newStatus = String(
        result.status || (action === "cancel" ? "İptal Edildi" : "İade Talebi"),
      );
      showToast(
        action === "cancel"
          ? "Siparişiniz iptal edildi."
          : "İade talebiniz alındı.",
        "success",
      );
      setMyOrders((orders) =>
        orders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: newStatus,
                payment_status:
                  action === "cancel" ? "refunded" : order.payment_status,
              }
            : order,
        ),
      );
      return true;
    } catch (err: unknown) {
      showToast(
        "İşlem başarısız: " +
          (err instanceof Error ? err.message : "Bilinmeyen hata"),
        "error",
      );
      return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">
        Yükleniyor...
      </div>
    );
  }

  if (!user) return null;

  const displayName = getDisplayName(user, customerProfile);

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-10 px-4 mt-16 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                👤
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">
                  PRESTİGESO ÜYESİ
                </p>
                <h2 className="font-black text-sm uppercase truncate text-black">
                  {displayName}
                </h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 truncate">
                  {customerProfile?.email || user.email}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
            <button
              type="button"
              onClick={() => handleTabChange("orders")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "orders" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span className="text-lg">📦</span> Siparişlerim (
              {myOrders.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("favorites")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "favorites" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span className="text-lg">❤️</span> Favorilerim (
              {favorites.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("addresses")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "addresses" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span className="text-lg">📍</span> Kayıtlı Adreslerim
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("coupons")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "coupons" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span className="text-lg">🎟️</span> İndirim Kuponlarım
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("reviews")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "reviews" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span className="text-lg">⭐</span> Değerlendirmelerim (
              {myReviews.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("questions")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "questions" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span className="text-lg">💬</span> Sorularım (
              {myQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("messages")}
              className={`text-left p-4 border-b border-gray-50 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "messages" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span className="text-lg">📧</span> Mesajlarım (
              {myMessages.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("settings")}
              className={`text-left p-4 font-bold text-sm transition-all flex items-center gap-3 ${activeTab === "settings" ? "bg-black text-white" : "text-gray-600 hover:bg-gray-50"}`}
            >
              <span className="text-lg">⚙️</span> Hesap Ayarlarım
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMessageModalOpen(true)}
            className="w-full text-center bg-white p-4 rounded-3xl border border-gray-100 font-black text-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-3"
          >
            <span>💬</span> Satıcıya Mesaj Gönder
          </button>
          <button
            type="button"
            onClick={() => {
              clearCart();
              try {
                safeStorageRemove("local", "prestige_viewed");
                safeStorageRemove("local", "prestigeso_profile_tab");
              } catch (error) {
                console.warn("Yerel profil verileri temizlenemedi:", error);
              }
              supabase.auth.signOut().then(() => router.push("/login"));
            }}
            className="w-full text-center bg-white p-4 rounded-3xl border border-gray-100 font-bold text-red-500 text-sm hover:bg-red-50 transition-all shadow-sm mt-2"
          >
            Güvenli Çıkış
          </button>
        </div>

        <div className="w-full md:w-3/4 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[50vh]">
            {activeTab === "orders" && (
              <OrdersTab orders={myOrders} onOrderAction={handleOrderAction} />
            )}
            {activeTab === "favorites" && (
              <FavoritesTab
                favorites={favorites}
                removeFavorite={removeFavorite}
              />
            )}
            {activeTab === "addresses" && (
              <AddressesTab
                user={user}
                addresses={addresses}
                setAddresses={setAddresses}
              />
            )}
            {activeTab === "reviews" && <ReviewsTab reviews={myReviews} />}
            {activeTab === "questions" && (
              <QuestionsTab questions={myQuestions} />
            )}
            {activeTab === "messages" && <MessagesTab messages={myMessages} />}
            {activeTab === "coupons" && <CouponsTab />}
            {activeTab === "settings" && (
              <SettingsTab
                user={user}
                setUser={setUser}
                customerProfile={customerProfile}
                setCustomerProfile={setCustomerProfile}
              />
            )}
          </div>

          {recentlyViewed.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-in slide-in-from-bottom-5">
              <h3 className="text-sm font-black uppercase tracking-tight mb-4 text-black border-l-4 border-black pl-3">
                Son Gezdikleriniz
              </h3>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {recentlyViewed.map((item) => {
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
                        <Image
                          width={100}
                          height={100}
                          src={displayImage}
                          alt={item.name || "Ürün"}
                          className="h-full w-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500 ease-out"
                        />
                      </div>
                      <h4 className="font-bold text-[9px] uppercase truncate text-black">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <span
                          className={`text-[8px] ${ratingCount > 0 ? "text-yellow-400" : "text-gray-300"}`}
                        >
                          {"★".repeat(
                            Math.min(5, Math.max(0, Math.round(avgRating))),
                          )}
                          {"☆".repeat(
                            5 - Math.min(5, Math.max(0, Math.round(avgRating))),
                          )}
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

      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight">
                Satıcıya Mesaj Gönder
              </h2>
              <button
                type="button"
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
