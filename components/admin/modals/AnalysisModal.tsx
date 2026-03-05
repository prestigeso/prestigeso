"use client";

type Tab = "revenue" | "orders" | "visits";

type Props = {
  open: boolean;
  onClose: () => void;

  tab: Tab;
  setTab: (t: Tab) => void;

  allTimeRevenue: number;
  allTimeOrders: number;
  allTimeVisits: number;
};

export default function AnalysisModal({
  open,
  onClose,
  tab,
  setTab,
  allTimeRevenue,
  allTimeOrders,
  allTimeVisits,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 relative z-10">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 text-black">
            <span>📊</span> PRESTİGESO Finans Raporu
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-6 bg-gray-50 p-2 rounded-2xl w-max mx-auto relative z-10">
          <button
            type="button"
            onClick={() => setTab("revenue")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === "revenue"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-200"
            }`}
          >
            💰 Toplam Ciro
          </button>

          <button
            type="button"
            onClick={() => setTab("orders")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === "orders"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-200"
            }`}
          >
            📦 Toplam Sipariş
          </button>

          <button
            type="button"
            onClick={() => setTab("visits")}
            className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              tab === "visits"
                ? "bg-black text-white shadow-md"
                : "text-gray-500 hover:bg-gray-200"
            }`}
          >
            👁️ Toplam Ziyaret
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center py-10 relative z-10">
          {tab === "revenue" && (
            <div className="text-center animate-in zoom-in duration-300">
              <span className="text-7xl mb-6 block drop-shadow-sm">💰</span>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">
                Tüm Zamanlar Cirosu
              </h3>
              <p className="text-5xl md:text-7xl font-black text-green-600 tracking-tighter">
                {Number(allTimeRevenue || 0).toLocaleString("tr-TR")} ₺
              </p>
              <p className="mt-6 text-xs font-bold text-green-700 bg-green-50 px-6 py-3 rounded-full uppercase tracking-widest border border-green-100">
                Sistemin açıldığı ilk günden bugüne toplam gelir.
              </p>
            </div>
          )}

          {tab === "orders" && (
            <div className="text-center animate-in zoom-in duration-300">
              <span className="text-7xl mb-6 block drop-shadow-sm">📦</span>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">
                Tüm Zamanlar Siparişi
              </h3>
              <p className="text-5xl md:text-7xl font-black text-black tracking-tighter">
                {Number(allTimeOrders || 0)}
              </p>
              <p className="mt-6 text-xs font-bold text-gray-600 bg-gray-100 px-6 py-3 rounded-full uppercase tracking-widest border border-gray-200">
                Sistemin açıldığı ilk günden bugüne toplam alınan sipariş.
              </p>
            </div>
          )}

          {tab === "visits" && (
            <div className="text-center animate-in zoom-in duration-300">
              <span className="text-7xl mb-6 block drop-shadow-sm">👁️</span>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">
                Tüm Zamanlar Ziyaretçisi
              </h3>
              <p className="text-5xl md:text-7xl font-black text-blue-600 tracking-tighter">
                {Number(allTimeVisits || 0)}
              </p>
              <p className="mt-6 text-xs font-bold text-blue-700 bg-blue-50 px-6 py-3 rounded-full uppercase tracking-widest border border-blue-100">
                Sistemin açıldığı ilk günden bugüne toplam tekil oturum.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}