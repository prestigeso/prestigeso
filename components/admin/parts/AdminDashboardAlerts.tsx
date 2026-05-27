"use client";

type AdminDashboardAlertsProps = {
  pendingOrdersCount: number;
  unansweredQuestionsCount: number;
  pendingReviewsCount: number;
  unreadMessagesCount: number;
  onOpenOrders: () => void;
  onOpenQuestions: () => void;
  onOpenReviews: () => void;
  onOpenMessages: () => void;
};

type AlertCard = {
  icon: string;
  title: string;
  description: string;
  count: number;
  toneClassName: string;
  onClick: () => void;
};

function formatCount(value: number) {
  return Number(value || 0).toLocaleString("tr-TR");
}

export default function AdminDashboardAlerts({
  pendingOrdersCount,
  unansweredQuestionsCount,
  pendingReviewsCount,
  unreadMessagesCount,
  onOpenOrders,
  onOpenQuestions,
  onOpenReviews,
  onOpenMessages,
}: AdminDashboardAlertsProps) {
  const cards: AlertCard[] = [
    {
      icon: "📦",
      title: "Bekleyen Siparişler",
      description: "İşlem veya kargo güncellemesi bekleyen siparişleri kontrol edin.",
      count: pendingOrdersCount,
      toneClassName: "bg-orange-50 text-orange-600 border-orange-100",
      onClick: onOpenOrders,
    },
    {
      icon: "💬",
      title: "Cevapsız Sorular",
      description: "Müşterilerden gelen ürün sorularını hızlıca yanıtlayın.",
      count: unansweredQuestionsCount,
      toneClassName: "bg-blue-50 text-blue-600 border-blue-100",
      onClick: onOpenQuestions,
    },
    {
      icon: "⭐",
      title: "Onay Bekleyen Yorumlar",
      description: "Yayına alınmayı bekleyen ürün değerlendirmelerini inceleyin.",
      count: pendingReviewsCount,
      toneClassName: "bg-yellow-50 text-yellow-600 border-yellow-100",
      onClick: onOpenReviews,
    },
    {
      icon: "📧",
      title: "Okunmamış Mesajlar",
      description: "Müşteri mesajlarını görüntüleyin ve gerekli dönüşleri yapın.",
      count: unreadMessagesCount,
      toneClassName: "bg-emerald-50 text-emerald-600 border-emerald-100",
      onClick: onOpenMessages,
    },
  ];

  const totalAlerts = cards.reduce((total, card) => total + Number(card.count || 0), 0);

  return (
    <section className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Operasyon Merkezi
          </p>
          <h2 className="text-lg md:text-xl font-black text-black uppercase tracking-tight">
            Hızlı Kontrol Paneli
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 border border-gray-100 px-4 py-2 w-max">
          <span className="w-2 h-2 rounded-full bg-black" />
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Toplam {formatCount(totalAlerts)} aksiyon
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((card) => {
          const hasAlert = Number(card.count || 0) > 0;

          return (
            <button
              key={card.title}
              type="button"
              onClick={card.onClick}
              className={`text-left rounded-2xl border p-4 transition-all active:scale-[0.98] ${
                hasAlert
                  ? `${card.toneClassName} hover:shadow-md`
                  : "bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-2xl leading-none">{card.icon}</span>
                <span
                  className={`min-w-8 h-8 px-2 rounded-full flex items-center justify-center text-xs font-black border ${
                    hasAlert ? "bg-white/80 border-current/10" : "bg-white border-gray-100"
                  }`}
                >
                  {formatCount(card.count)}
                </span>
              </div>

              <h3 className="text-sm font-black uppercase tracking-tight mt-4 text-black">
                {card.title}
              </h3>
              <p className="text-[11px] font-bold leading-relaxed mt-2 opacity-70">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
