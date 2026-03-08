"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ALT BİLEŞENLERİ (COMPONENT) İÇERİ AKTARIYORUZ
import AddressesTab from "@/components/profile/AddressesTab";
import OrdersTab from "@/components/profile/OrdersTab";
import FavoritesTab from "@/components/profile/FavoritesTab";
import ReviewsTab from "@/components/profile/ReviewsTab";
import QuestionsTab from "@/components/profile/QuestionsTab";
import MessagesTab from "@/components/profile/MessagesTab";
import CouponsTab from "@/components/profile/CouponsTab";
import SettingsTab from "@/components/profile/SettingsTab";
// TODO: Diğer sekmeleri de ayırdıkça buraya ekleyeceğiz (ReviewsTab, QuestionsTab vb.)

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    // ... (Senin yazdığın o efsane uzun Supabase veri çekme useEffect'in BURADA BİREBİR AYNI KALACAK. Kod kalabalığı olmasın diye burayı senin mevcut useEffect'inle aynı say)
    // Lütfen buraya kendi yazdığın useEffect bloğunu olduğu gibi kopyala/yapıştır.
  }, [router]);

  const removeFavorite = async (productId: string) => {
    if (!user) return;
    const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("product_id", productId);
    if (!error) setFavorites(favorites.filter((item) => item.id !== productId));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    // ... (Senin mesaj gönderme fonksiyonun aynı kalacak)
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">Yükleniyor...</div>;
  if (!user) return null;

  const profileCompletion = 85;

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-10 px-4 mt-16 font-sans">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        
        {/* SOL MENÜ (Sabit Kalıyor) */}
        <div className="w-full md:w-1/4 flex flex-col gap-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
             {/* ... (Profil Yüzdesi ve Sol Sekme Butonların Aynı Kalacak) ... */}
          </div>
        </div>

        {/* SAĞ İÇERİK (SİHRİN OLDUĞU YER) */}
        <div className="w-full md:w-3/4 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 min-h-[50vh]">
            
            {/* COMPONENTLERE VERİLERİ (PROPS) GÖNDERİYORUZ */}
            {activeTab === "orders" && <OrdersTab orders={myOrders} />}
            {activeTab === "favorites" && <FavoritesTab favorites={favorites} removeFavorite={removeFavorite} />}
            {activeTab === "addresses" && <AddressesTab user={user} addresses={addresses} setAddresses={setAddresses} />}
            {/* YENİ EKLENEN JİLET GİBİ BİLEŞENLER */}
            {activeTab === "reviews" && <ReviewsTab reviews={myReviews} />}
            {activeTab === "questions" && <QuestionsTab questions={myQuestions} />}
            {activeTab === "messages" && <MessagesTab messages={myMessages} />}
            {activeTab === "coupons" && <CouponsTab />}
            {activeTab === "settings" && <SettingsTab user={user} />}
            {/* Diğer sekmeleri de yavaş yavaş böleceğiz */}
            {activeTab === "reviews" && <div>Değerlendirmelerim (Bölünecek)</div>}
            {activeTab === "questions" && <div>Sorularım (Bölünecek)</div>}
            {activeTab === "messages" && <div>Mesajlarım (Bölünecek)</div>}
            {activeTab === "coupons" && <div>Kuponlarım (Bölünecek)</div>}

          </div>
        </div>

      </div>
    </div>
  );
}