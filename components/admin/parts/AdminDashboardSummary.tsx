"use client";

type AdminDashboardSummaryProps = {
  activeMonth: string;
  monthlyRevenue: number;
  monthlyOrders: number;
  monthlyVisits: number;
  totalProducts: number;
};

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("tr-TR");
}

export default function AdminDashboardSummary({
  activeMonth,
  monthlyRevenue,
  monthlyOrders,
  monthlyVisits,
  totalProducts,
}: AdminDashboardSummaryProps) {
  const cards = [
    {
      icon: "💸",
      label: `${activeMonth} CİROSU`,
      value: `${formatNumber(monthlyRevenue)} ₺`,
      valueClassName: "text-green-600",
      hoverClassName: "hover:border-green-200",
    },
    {
      icon: "📦",
      label: `${activeMonth} SİPARİŞİ`,
      value: formatNumber(monthlyOrders),
      valueClassName: "text-black",
      hoverClassName: "hover:border-black",
    },
    {
      icon: "👁️",
      label: `${activeMonth} ZİYARETİ`,
      value: formatNumber(monthlyVisits),
      valueClassName: "text-blue-600",
      hoverClassName: "hover:border-blue-200",
    },
    {
      icon: "🛍️",
      label: "TOPLAM ÜRÜN",
      value: formatNumber(totalProducts),
      valueClassName: "text-black",
      hoverClassName: "hover:border-black",
    },
  ];

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center hover:shadow-md transition-all ${card.hoverClassName}`}
        >
          <span className="text-3xl mb-2">{card.icon}</span>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
            {card.label}
          </p>
          <p className={`text-3xl font-black ${card.valueClassName}`}>{card.value}</p>
        </div>
      ))}
    </section>
  );
}
