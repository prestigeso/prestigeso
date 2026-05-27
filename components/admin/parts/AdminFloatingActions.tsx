"use client";

type AdminFloatingActionsProps = {
  isFabOpen: boolean;
  setIsFabOpen: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenAddProduct: () => void;
  onOpenCampaign: () => void;
  onOpenCoupons: () => void;
};

export default function AdminFloatingActions({
  isFabOpen,
  setIsFabOpen,
  onOpenSettings,
  onOpenAddProduct,
  onOpenCampaign,
  onOpenCoupons,
}: AdminFloatingActionsProps) {
  return (
    <>
      <div className="fixed bottom-6 left-6 z-40">
        <button
          type="button"
          onClick={onOpenSettings}
          className="bg-white text-black border border-gray-200 shadow-xl px-5 py-3.5 rounded-full font-bold flex items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all text-sm"
        >
          <span>⚙️</span> Özel Panel
        </button>
      </div>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <div
          className={`flex flex-col items-end gap-3 transition-all duration-300 origin-bottom ${
            isFabOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-50 translate-y-10 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setIsFabOpen(false);
              onOpenAddProduct();
            }}
            className="bg-white text-black border border-gray-200 shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-gray-50 w-max"
          >
            <span>📦</span> Yeni Ürün Ekle
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFabOpen(false);
              onOpenCampaign();
            }}
            className="bg-blue-600 text-white shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-blue-700 w-max"
          >
            <span>🏷️</span> Kampanya / İndirim
          </button>

          <button
            type="button"
            onClick={() => {
              setIsFabOpen(false);
              onOpenCoupons();
            }}
            className="bg-emerald-600 text-white shadow-lg px-4 py-3 rounded-2xl font-bold text-sm flex items-center gap-3 hover:bg-emerald-700 w-max"
          >
            <span>🎟️</span> Kupon Yönetimi
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsFabOpen(!isFabOpen)}
          className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center text-3xl font-light transition-all duration-300 z-50 ${
            isFabOpen
              ? "bg-red-500 text-white rotate-45"
              : "bg-black text-white rotate-0 hover:scale-105"
          }`}
        >
          +
        </button>
      </div>
    </>
  );
}
