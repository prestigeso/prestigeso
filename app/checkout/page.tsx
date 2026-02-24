"use client";

import { useCart } from "@/context/CartContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function CheckoutPage() {
  const { cart, cartTotal } = useCart();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Form stateleri
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
  });

  useEffect(() => {
    // Sayfa yüklendiğinde eğer sepet boşsa adamı mağazaya geri şutla
    if (cart.length === 0) {
      router.push("/shop");
    } else {
      setLoading(false);
    }
  }, [cart, router]);

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Arkadaşının dükkanı için şimdilik en kral yöntem WhatsApp Sipariş hattıdır!
    // Müşterinin form bilgilerini ve sepetini birleştirip WhatsApp mesajına çeviriyoruz:
    const orderDetails = cart.map(item => `${item.quantity}x ${item.name} (${item.price} TL)`).join("%0A");
    
    const message = `*YENİ PRESTİGESO SİPARİŞİ* 🚀%0A%0A*Müşteri:* ${formData.fullName}%0A*Telefon:* ${formData.phone}%0A*Şehir:* ${formData.city}%0A*Adres:* ${formData.address}%0A%0A*SİPARİŞ DETAYI:*%0A${orderDetails}%0A%0A*TOPLAM TUTAR:* ${cartTotal} TL`;
    
    // WhatsApp'a yönlendir (Kendi numaranızı yazın, örn: 905551234567)
    window.open(`https://wa.me/905555555555?text=${message}`, '_blank');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase tracking-widest text-gray-400">Yönlendiriliyor...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-20 px-4 font-sans text-black">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest mb-8 border-l-4 border-black pl-4">Ödeme Adımı</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* SOL: TESLİMAT BİLGİLERİ FORMU */}
          <div className="w-full lg:w-2/3 bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-gray-100">
            <h2 className="text-lg font-black uppercase tracking-tight mb-6">Teslimat Bilgileri</h2>
            
            <form id="checkoutForm" onSubmit={handleCompleteOrder} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Ad Soyad</label>
                  <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-2 focus:ring-black outline-none transition-all" placeholder="Tam adınızı giriniz" />
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

              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex items-start gap-3">
                <span className="text-xl">🛡️</span>
                <p className="text-xs font-bold text-green-800 leading-relaxed">
                  Siparişiniz WhatsApp üzerinden mağazamıza iletilecektir. Müşteri temsilcimiz onay ve ödeme adımları için sizinle iletişime geçecektir.
                </p>
              </div>
            </form>
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
                  <span>TOPLAM</span>
                  <span>{cartTotal} ₺</span>
                </div>
              </div>

              <button 
                form="checkoutForm" 
                type="submit" 
                className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-gray-800 active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                <span>SİPARİŞİ TAMAMLA</span>
                <span className="text-lg">›</span>
              </button>
              
              <div className="mt-4 text-center">
                <Link href="/shop" className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-400 hover:text-black hover:border-black transition-colors">
                  Alışverişe Dön
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}