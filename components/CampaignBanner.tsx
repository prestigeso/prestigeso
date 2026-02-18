// components/CampaignBanner.tsx
export default function CampaignBanner() {
  return (
    <div className="bg-black text-white text-xs font-bold py-2 overflow-hidden relative z-50">
      <div className="whitespace-nowrap animate-marquee flex gap-10">
        <span>🚚 500 TL VE ÜZERİ KARGO BEDAVA!</span>
        <span>🔥 SEZON İNDİRİMLERİ BAŞLADI</span>
        <span>💳 VADE FARKSIZ 3 TAKSİT İMKANI</span>
        <span>✨ YENİ ÜYELERE ÖZEL %10 İNDİRİM KODU: PRESTIGE10</span>
        {/* Sonsuz döngü için tekrar */}
        <span>🚚 500 TL VE ÜZERİ KARGO BEDAVA!</span>
        <span>🔥 SEZON İNDİRİMLERİ BAŞLADI</span>
        <span>💳 VADE FARKSIZ 3 TAKSİT İMKANI</span>
      </div>
      
      {/* Basit animasyon stili */}
      <style jsx>{`
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}