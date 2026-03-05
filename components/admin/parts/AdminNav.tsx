"use client";

type Props = {
  activeNavMenu: string | null;
  setActiveNavMenu: (v: string | null) => void;

  // badges
  unansweredQuestionsCount: number;
  pendingReviewsCount: number;
  pendingOrdersCount: number;
  unreadMessagesCount: number;

  // open actions
  onOpenQuestions: () => void;
  onOpenReviews: () => void;
  onOpenMessages: () => void;
  onOpenOrders: () => void;

  // perf & analysis open actions
  onOpenPerformanceFavorites: () => void;
  onOpenPerformanceReviews: () => void;
  onOpenPerformanceViews: () => void;

  onOpenAnalysisRevenue: () => void;
  onOpenAnalysisOrders: () => void;
  onOpenAnalysisVisits: () => void;
};

export default function AdminNav({
  activeNavMenu,
  setActiveNavMenu,

  unansweredQuestionsCount,
  pendingReviewsCount,
  pendingOrdersCount,
  unreadMessagesCount,

  onOpenQuestions,
  onOpenReviews,
  onOpenMessages,
  onOpenOrders,

  onOpenPerformanceFavorites,
  onOpenPerformanceReviews,
  onOpenPerformanceViews,

  onOpenAnalysisRevenue,
  onOpenAnalysisOrders,
  onOpenAnalysisVisits,
}: Props) {
  return (
    <nav className="bg-white shadow-sm mb-6 flex justify-center gap-10 relative z-40">
      {/* MÜŞTERİ */}
      <div
        className="relative"
        onMouseEnter={() => setActiveNavMenu("musteri")}
        onMouseLeave={() => setActiveNavMenu(null)}
      >
        <button className="py-4 text-xs font-black text-gray-500 hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors">
          Müşteri ▾
        </button>

        {activeNavMenu === "musteri" && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-xl rounded-xl py-2 w-52 flex flex-col z-50">
            <button
              onClick={() => {
                setActiveNavMenu(null);
                onOpenQuestions();
              }}
              className="w-full px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest flex justify-between items-center"
            >
              <span>Ürün Soruları</span>
              {unansweredQuestionsCount > 0 && (
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                  {unansweredQuestionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveNavMenu(null);
                onOpenReviews();
              }}
              className="w-full px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest flex justify-between items-center"
            >
              <span>⭐ Değerlendirmeler</span>
              {pendingReviewsCount > 0 && (
                <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                  {pendingReviewsCount} ONAY
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveNavMenu(null);
                onOpenMessages();
              }}
              className="w-full px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest flex justify-between items-center"
            >
              <span>Müşteri Mesajları</span>
              {unreadMessagesCount > 0 && (
                <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[9px] font-black">
                  {unreadMessagesCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* SİPARİŞLER */}
      <button
        onClick={onOpenOrders}
        className="py-4 text-xs font-black text-gray-500 hover:text-black uppercase tracking-widest flex items-center gap-2 transition-colors relative"
      >
        Siparişler
        {pendingOrdersCount > 0 && (
          <span className="bg-green-500 text-white px-1.5 py-0.5 rounded-full text-[9px] animate-pulse shadow-sm">
            {pendingOrdersCount} YENİ
          </span>
        )}
      </button>

      {/* PERFORMANS */}
      <div
        className="relative"
        onMouseEnter={() => setActiveNavMenu("performans")}
        onMouseLeave={() => setActiveNavMenu(null)}
      >
        <button className="py-4 text-xs font-black text-gray-500 hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors">
          Performans ▾
        </button>

        {activeNavMenu === "performans" && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-xl rounded-xl py-2 w-60 flex flex-col z-50">
            <button
              onClick={() => {
                setActiveNavMenu(null);
                onOpenPerformanceFavorites();
              }}
              className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest border-b border-gray-50"
            >
              ❤️ Favori İstatistikleri
            </button>
            <button
              onClick={() => {
                setActiveNavMenu(null);
                onOpenPerformanceReviews();
              }}
              className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest border-b border-gray-50"
            >
              ⭐ Değerlendirme İstatistikleri
            </button>
            <button
              onClick={() => {
                setActiveNavMenu(null);
                onOpenPerformanceViews();
              }}
              className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest"
            >
              👁️ Ürün Görüntülenmesi
            </button>
          </div>
        )}
      </div>

      {/* ANALİZ */}
      <div
        className="relative"
        onMouseEnter={() => setActiveNavMenu("analiz")}
        onMouseLeave={() => setActiveNavMenu(null)}
      >
        <button className="py-4 text-xs font-black text-gray-500 hover:text-black uppercase tracking-widest flex items-center gap-1 transition-colors">
          Analiz ▾
        </button>

        {activeNavMenu === "analiz" && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 bg-white border border-gray-100 shadow-xl rounded-xl py-2 w-60 flex flex-col z-50">
            <button
              onClick={() => {
                setActiveNavMenu(null);
                onOpenAnalysisRevenue();
              }}
              className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest border-b border-gray-50"
            >
              💰 Tüm Zamanlar Cirosu
            </button>
            <button
              onClick={() => {
                setActiveNavMenu(null);
                onOpenAnalysisOrders();
              }}
              className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest border-b border-gray-50"
            >
              📦 Tüm Zamanlar Siparişi
            </button>
            <button
              onClick={() => {
                setActiveNavMenu(null);
                onOpenAnalysisVisits();
              }}
              className="px-4 py-3 text-[11px] text-left text-gray-500 hover:bg-gray-50 hover:text-black font-black uppercase tracking-widest"
            >
              👁️ Tüm Zamanlar Ziyareti
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}