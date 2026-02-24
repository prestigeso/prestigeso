"use client";

import { useCart } from "@/context/CartContext"; // Navbar ile aynı beyin (Context) kullanıldı!

export default function CartDrawer() {
  const { items, removeFromCart, setIsCartOpen } = useCart();

  // Sepetin boş gelme ihtimaline karşı güvenlik önlemi
  const safeItems = items || [];
  
  // Toplam tutarı jilet gibi hesaplıyoruz
  const totalTutar = safeItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  // EFSANE DETAY: Sepetteki tüm ürünleri WhatsApp'a otomatik listeleme
  const handleCheckoutWhatsApp = () => {
    let message = "Merhaba! PRESTİGESO sepetimdeki ürünleri sipariş vermek istiyorum:\n\n";
    safeItems.forEach((item, index) => {
      message += `▪ ${item.name} (${item.quantity} Adet) - ${item.price * item.quantity} ₺\n`;
    });
    message += `\n*Toplam Tutar: ${totalTutar.toLocaleString("tr-TR")} ₺*`;
    window.open(`https://wa.me/905525280105?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans">
      
      {/* Üst Başlık ve Kapatma Butonu */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-xl font-black text-black uppercase tracking-widest">SEPETİM</h2>
          <p className="text-xs text-gray-400 font-bold tracking-wider mt-1">{safeItems.length} ÜRÜN</p>
        </div>
        <button 
          onClick={() => setIsCartOpen(false)}
          className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-500 rounded-full hover:bg-black hover:text-white transition-all active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      {/* Ürün Listesi */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white hide-scrollbar">
        {safeItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 animate-in fade-in">
            <div className="w-24 h-24 mb-6 rounded-full bg-gray-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-gray-300"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            </div>
            <p className="text-black font-black uppercase tracking-widest mb-2">SEPETİNİZ BOŞ</p>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">İmza tarzınızı bulmak için vitrine göz atın.</p>
            <button 
              onClick={() => setIsCartOpen(false)}
              className="mt-8 border-2 border-black text-black px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
            >
              Alışverişe Dön
            </button>
          </div>
        ) : (
          safeItems.map((item) => (
            <div key={item.id} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm relative group">
              <div className="relative w-20 h-24 bg-gray-50 rounded-xl overflow-hidden border border-gray-100 flex-shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
              </div>
              <div className="flex-1 pr-8">
                <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest mb-0.5">PRESTİGESO</p>
                <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-2">{item.name}</h3>
                
                <div className="flex items-end justify-between">
                  <p className="text-base font-black text-black tracking-tight">{Number(item.price).toLocaleString("tr-TR")} ₺</p>
                  <p className="text-[10px] text-gray-400 font-bold border border-gray-200 px-2 py-1 rounded-md">x{item.quantity}</p>
                </div>
              </div>
              
              {/* Şık Silme Butonu */}
              <button 
                onClick={() => removeFromCart(item.id)}
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Ürünü Çıkar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Alt Toplam ve Ödeme Butonu */}
      {safeItems.length > 0 && (
        <div className="p-6 border-t border-gray-100 bg-white shadow-[0_-15px_30px_rgba(0,0,0,0.03)] z-10">
          <div className="flex justify-between items-end mb-6">
            <span className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em]">ARA TOPLAM</span>
            <span className="text-3xl font-black text-black tracking-tighter">{totalTutar.toLocaleString("tr-TR")} ₺</span>
          </div>
          <button 
            onClick={handleCheckoutWhatsApp}
            className="w-full py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            WhatsApp'tan Sipariş Ver <span className="text-xl leading-none">›</span>
          </button>
          <p className="text-center text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-4">
            ÜCRETSİZ KARGO VE GÜVENLİ TESLİMAT
          </p>
        </div>
      )}
    </div>
  );
}