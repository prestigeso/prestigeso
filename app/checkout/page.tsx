"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  const [addressData, setAddressData] = useState({
    email: "", // YENİ: Misafirler için e-posta alanı
    firstName: "",
    lastName: "",
    phone: "",
    city: "",
    district: "",
    neighborhood: "",
    fullAddress: "",
    addressTitle: "",
  });

  const { items: cartItems, cartTotal, clearCart } = useCart();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        setAddressData((prev) => ({ ...prev, email: session.user.email || "" }));
      } else {
        // Eğer session yoksa, bu adam MİSAFİRDİR.
        setIsGuest(true);
      }
    };
    checkUser();
  }, []);

  useEffect(() => {
    if (cartItems.length === 0 && !isProcessing) {
      router.push("/");
    }
  }, [cartItems, isProcessing, router]);

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;
    setAddressData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      // =======================================================
      // YENİ: MİSAFİR E-POSTA DEDEKTİFİ (Eğer kayıtlıysa durdur)
      // =======================================================
      if (isGuest && addressData.email) {
        const { data: existingUserOrder } = await supabase
          .from("orders")
          .select("id")
          .eq("user_email", addressData.email.toLowerCase())
          .not("user_id", "is", null) // user_id'si boş DEĞİLSE bu adam üyedir
          .limit(1);

        if (existingUserOrder && existingUserOrder.length > 0) {
          alert(
            "❌ Bu e-posta adresiyle sistemimizde zaten bir hesabınız bulunuyor. Lütfen giriş yaparak devam ediniz."
          );
          router.push("/login");
          return;
        }
      }
      // =======================================================

      // 1. ZIRH: STOK KONTROLÜ
      for (const item of cartItems) {
        const { data: pData, error: pErr } = await supabase
          .from("products")
          .select("stock, name")
          .eq("id", item.id)
          .single();

        if (pErr || !pData) throw new Error("Ürün bilgisine ulaşılamadı.");

        const currentStock = Number(pData.stock) || 0;
        const requestedQuantity = Number(item.quantity) || 1;

        if (currentStock < requestedQuantity) {
          alert(
            `❌ Hata: "${pData.name}" ürünü için yeterli stok yok! (Kalan: ${currentStock})`
          );
          setIsProcessing(false);
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const formattedAddress = JSON.stringify(addressData);
      // YENİ NESİL: ASİL SİPARİŞ NUMARASI ÜRETİCİSİ (Örn: PRS-2026-582910)
      const currentYear = new Date().getFullYear();
      const randomSixDigits = Math.floor(100000 + Math.random() * 900000);
      const generatedOrderNo = `PRS-${currentYear}-${randomSixDigits}`;

      // 2. SİPARİŞİ VERİTABANINA YAZ
      const { error } = await supabase.from("orders").insert([
        {
          order_no: generatedOrderNo, // YENİ: Sipariş Numaramız!
          user_id: user ? user.id : null,
          user_email: addressData.email.toLowerCase(),
          items: cartItems,
          total_amount: cartTotal,
          shipping_address: formattedAddress,
          status: "Bekliyor" 
        }
      ]);

      if (error) throw error;

      // 3. STOK DÜŞME MOTORU
      for (const item of cartItems) {
        const { data: pData } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.id)
          .single();

        if (pData) {
          const newStock = Math.max(
            0,
            (Number(pData.stock) || 0) - (Number(item.quantity) || 1)
          );
          await supabase.from("products").update({ stock: newStock }).eq("id", item.id);
        }
      }

      alert(`Siparişiniz başarıyla alındı! 🎉\nSipariş Numaranız: ${generatedOrderNo}\n\nBu numarayla siparişinizi takip edebilirsiniz.`);
      clearCart();
      router.push(user ? "/profile" : "/");
    } catch (error: any) {
      alert("Sipariş oluşturulurken hata oluştu: " + error.message);
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-20 px-4 mt-10 font-sans text-black">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* SOL: DETAYLI ADRES VE ÖDEME */}
        <div className="flex-1 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-black uppercase tracking-tight mb-6 border-b-2 border-gray-100 pb-4">
            {isGuest ? "İletişim & Teslimat Bilgileri" : "Teslimat Adresi"}
          </h1>

          <form onSubmit={handleCompleteOrder} className="space-y-6">
            {/* EĞER MİSAFİRSE E-POSTA ZORUNLU İSTENİR */}
            {isGuest && (
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  E-Posta Adresiniz *
                </label>
                <input
                  required
                  name="email"
                  value={addressData.email}
                  onChange={handleInputChange}
                  type="email"
                  placeholder="Sipariş bilgilendirmeleri için gerekli"
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Ad *
                </label>
                <input
                  required
                  name="firstName"
                  value={addressData.firstName}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="Adınızı giriniz"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Soyad *
                </label>
                <input
                  required
                  name="lastName"
                  value={addressData.lastName}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="Soyadınızı giriniz"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Telefon *
                </label>
                <input
                  required
                  name="phone"
                  value={addressData.phone}
                  onChange={handleInputChange}
                  type="tel"
                  placeholder="0 (5__) ___ __ __"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  İl *
                </label>
                <input
                  required
                  name="city"
                  value={addressData.city}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="Örn: İstanbul"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  İlçe *
                </label>
                <input
                  required
                  name="district"
                  value={addressData.district}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="Örn: Kadıköy"
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Mahalle *
                </label>
                <input
                  required
                  name="neighborhood"
                  value={addressData.neighborhood}
                  onChange={handleInputChange}
                  type="text"
                  placeholder="Örn: Caferağa Mah."
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Açık Adres *
              </label>
              <textarea
                required
                name="fullAddress"
                value={addressData.fullAddress}
                onChange={handleInputChange}
                rows={3}
                placeholder="Cadde, sokak, bina ve diğer bilgileri giriniz."
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-medium resize-none outline-none focus:border-black transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                Adres Başlığı *
              </label>
              <input
                required
                name="addressTitle"
                value={addressData.addressTitle}
                onChange={handleInputChange}
                type="text"
                placeholder="Örn: Ev, İş"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium outline-none focus:border-black transition-all"
              />
            </div>

            {/* KART BİLGİLERİ */}
            <div className="p-6 bg-gray-900 rounded-2xl text-white relative overflow-hidden mt-8">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">
                Kart Bilgileri (Test Modu)
              </p>
              <div className="space-y-4 opacity-50 pointer-events-none">
                <input
                  type="text"
                  placeholder="Kart Numarası"
                  disabled
                  className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-sm"
                />
                <div className="flex gap-4">
                  <input
                    type="text"
                    placeholder="AA/YY"
                    disabled
                    className="w-1/2 p-3 bg-white/10 border border-white/20 rounded-xl text-sm"
                  />
                  <input
                    type="text"
                    placeholder="CVV"
                    disabled
                    className="w-1/2 p-3 bg-white/10 border border-white/20 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="w-full bg-black text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest disabled:opacity-50 shadow-xl active:scale-95 transition-all flex justify-center items-center"
            >
              {isProcessing
                ? "İşleniyor... ⏳"
                : `Ödemeyi Tamamla (${cartTotal.toLocaleString("tr-TR")} ₺) 🚀`}
            </button>
          </form>
        </div>

        {/* SAĞ: SİPARİŞ ÖZETİ */}
        <div className="w-full lg:w-[350px] bg-white p-6 rounded-3xl shadow-sm border border-gray-100 h-fit sticky top-24">
          <h2 className="text-sm font-black uppercase tracking-tight mb-4 border-b border-gray-100 pb-3">
            Sipariş Özeti
          </h2>
          <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
            {cartItems.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex gap-3 items-center border-b border-gray-50 pb-3"
              >
                <img
                  src={item.images?.[0] || item.image || "/logo.jpeg"}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                />
                <div className="flex-1">
                  <h4 className="text-[10px] font-bold uppercase text-black truncate">
                    {item.name}
                  </h4>
                  <p className="text-[10px] font-black text-gray-500">
                    {item.quantity || 1} Adet
                  </p>
                </div>
                <p className="text-xs font-black text-black">
                  {(
                    (Number(item.discount_price) > 0
                      ? Number(item.discount_price)
                      : Number(item.price)) *
                    (item.quantity || 1)
                  ).toLocaleString("tr-TR")}{" "}
                  ₺
                </p>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-gray-100 pt-4 space-y-2">
            <div className="flex justify-between text-xs font-bold text-gray-500">
              <span>Ara Toplam</span>
              <span>{cartTotal.toLocaleString("tr-TR")} ₺</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-gray-500">
              <span>Kargo</span>
              <span className="text-green-500">Ücretsiz</span>
            </div>
            <div className="flex justify-between text-lg font-black text-black pt-2 border-t border-gray-100 mt-2">
              <span>Toplam</span>
              <span>{cartTotal.toLocaleString("tr-TR")} ₺</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}