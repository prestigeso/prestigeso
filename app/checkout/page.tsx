"use client";

import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function CheckoutPage() {
  const { cart, cartTotal } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false); // İyzico bekleme state'i

  // Teslimat Bilgileri
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
  });

  // Kredi Kartı Bilgileri (Simülasyon)
  const [cardData, setCardData] = useState({
    cardName: "",
    cardNumber: "",
    expDate: "",
    cvv: ""
  });

  useEffect(() => {
    if (cart.length === 0) {
      router.push("/shop");
    } else {
      setLoading(false);
    }
  }, [cart, router]);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true); // Ödeme dönüyor animasyonunu başlat

    // IYZICO SİMÜLASYONU: 2 Saniye sahte bekleme süresi
    setTimeout(async () => {
      try {
        // 1. SİPARİŞİ VERİTABANINA (SUPABASE) KAYDET
        const { error } = await supabase.from("orders").insert([
          {
            full_name: formData.fullName,
            phone: formData.phone,
            city: formData.city,
            address: formData.address,
            total_amount: cartTotal,
            items: cart, 
            status: "Ödendi" // Iyzico başarılı dönerse statü Ödendi olur
          }
        ]);

        if (error) throw error;

        // 2. SEPETİ BOŞALT (LocalStorage temizlenip anasayfaya atılır)
        localStorage.removeItem("prestigeso_cart");
        
        alert("Ödeme Başarılı! Siparişiniz asilce alındı. 🚀");
        
        // Sayfayı tamamen yenileyerek anasayfaya yönlendir (Sepet context'inin sıfırlanması için)
        window.location.href = "/";
        
      } catch (err: any) {
        alert("Ödeme sırasında bir hata oluştu: " + err.message);
        setIsProcessing(false);
      }
    }, 2000); // 2000 milisaniye (2 saniye) Iyzico bekleme süresi
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">Güvenli Ödeme Noktasına Bağlanılıyor...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20 px-4 font-sans text-black">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center gap-4 mb-8">
           <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest border-l-4 border-black pl-4">Güvenli Ödeme</h1>
           <span className="bg-green-100 text-green-700 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
             <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
             SSL Korumalı
           </span>
        </div>

        <form id="checkoutForm" onSubmit={handlePayment} className="flex flex-col lg:flex-row gap-8">
          
          {/* SOL: FORMLAR (Teslimat + Kredi Kartı) */}
          <div className="w-full lg:w-2/3 flex flex-col gap-6">
            
            {/* 1. TESLİMAT BİLGİLERİ */}
            <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-gray-100">
              <h2 className="text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">1</span> 
                Teslimat Bilgileri
              </h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Ad Soyad</label>
                    <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none transition-all" placeholder="Kimlikteki tam adınız" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Telefon Numarası</label>
                    <input required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none transition-all" placeholder="05XX XXX XX XX" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Şehir / İlçe</label>
                  <input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none transition-all" placeholder="Örn: İstanbul, Kadıköy" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Açık Adres</label>
                  <textarea required rows={3} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-sm resize-none focus:ring-2 focus:ring-black outline-none transition-all" placeholder="Mahalle, sokak, bina ve daire no..." />
                </div>
              </div>
            </div>

            {/* 2. KREDİ KARTI BİLGİLERİ (IYZICO SİMÜLASYONU) */}
            <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                  <span className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs">2</span> 
                  Ödeme Bilgileri
                </h2>
                <div className="flex gap-2">
                  {/* Kart Logoları (Görsel) */}
                  <div className="w-8 h-5 bg-blue-900 rounded flex items-center justify-center text-[8px] text-white font-black italic">VISA</div>
                  <div className="w-8 h-5 bg-orange-500 rounded flex items-center justify-center text-[8px] text-white font-black italic">MC</div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Kart Üzerindeki İsim</label>
                  <input required type="text" value={cardData.cardName} onChange={e => setCardData({...cardData, cardName: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold uppercase focus:ring-2 focus:ring-black outline-none transition-all tracking-widest" placeholder="AD SOYAD" />
                </div>

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Kart Numarası</label>
                  <input required type="text" maxLength={19} value={cardData.cardNumber} onChange={e => setCardData({...cardData, cardNumber: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-black text-lg focus:ring-2 focus:ring-black outline-none transition-all tracking-widest" placeholder="0000 0000 0000 0000" />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Son Kullanma (AY/YIL)</label>
                    <input required type="text" maxLength={5} value={cardData.expDate} onChange={e => setCardData({...cardData, expDate: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none transition-all text-center tracking-widest" placeholder="12/25" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Güvenlik Kodu (CVV)</label>
                    <input required type="text" maxLength={3} value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none transition-all text-center tracking-widest" placeholder="***" />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* SAĞ: SİPARİŞ ÖZETİ */}
          <div className="w-full lg:w-1/3">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100 sticky top-24">
              <h2 className="text-lg font-black uppercase tracking-tight mb-6">Sipariş Özeti</h2>
              
              <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-4 items-center border-b border-gray-50 pb-4">
                    <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                      <img src={item.image || "/logo.jpeg"} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-bold uppercase line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-gray-400 font-black mt-1">Adet: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-black">{item.price * item.quantity} ₺</p>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-gray-100 pt-6 space-y-3 mb-8">
                <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                  <span>Ara Toplam</span>
                  <span>{cartTotal} ₺</span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                  <span>Kargo Ücreti</span>
                  <span className="text-green-600">Ücretsiz</span>
                </div>
                <div className="flex justify-between items-center text-xl font-black text-black pt-4 border-t border-gray-100">
                  <span>TOPLAM TUTAR</span>
                  <span>{cartTotal} ₺</span>
                </div>
              </div>

              {/* ÖDEME BUTONU */}
              <button 
                type="submit" 
                disabled={isProcessing}
                className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-gray-800 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:hover:bg-black disabled:active:scale-100"
              >
                {isProcessing ? (
                  <span className="animate-pulse">ÖDEME ALINIYOR... 🔄</span>
                ) : (
                  <>
                    <span>ÖDEMEYİ TAMAMLA</span>
                    <span className="text-lg">💳</span>
                  </>
                )}
              </button>
              
              <div className="mt-6 flex flex-col items-center gap-2">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">
                  Kart bilgileriniz 256-bit SSL sertifikası ile şifrelenmektedir.
                </p>
                <Link href="/shop" className="text-[10px] font-black text-black uppercase tracking-widest border-b border-black hover:text-gray-500 hover:border-gray-500 transition-colors mt-2">
                  Alışverişe Dön
                </Link>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}