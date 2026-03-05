"use client";

import type { OrderRow } from "../types";

type Props = {
  open: boolean;
  onClose: () => void;

  orders: OrderRow[];

  onUpdateStatus: (orderId: number, newStatus: string) => void;
};

export default function OrdersModal({
  open,
  onClose,
  orders,
  onUpdateStatus,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <span>📦</span> Sipariş Yönetimi
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

        <div className="overflow-y-auto space-y-6 flex-1 pr-2">
          {orders.length === 0 ? (
            <p className="text-center text-gray-400 font-bold py-20 uppercase tracking-widest text-sm">
              Sistemde henüz sipariş yok.
            </p>
          ) : (
            orders.map((order: any) => (
              <div
                key={order.id}
                className="p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 bg-white"
              >
                {/* LEFT */}
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Müşteri Email
                      </p>
                      <p className="font-bold text-sm text-black">{order.user_email}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Tarih
                      </p>
                      <p className="text-xs font-bold text-gray-600">
                        {new Date(order.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>

                  {/* ADDRESS BOX */}
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">
                      Teslimat Detayları
                    </p>

                    {(() => {
                      try {
                        const addr = JSON.parse(order.shipping_address);

                        return (
                          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">
                                Alıcı Kişi
                              </p>
                              <p className="text-xs font-black text-black">
                                {addr.firstName} {addr.lastName}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">
                                Telefon
                              </p>
                              <p className="text-xs font-black text-blue-600">
                                {addr.phone}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">
                                İl / İlçe
                              </p>
                              <p className="text-xs font-bold text-gray-800">
                                {addr.city} / {addr.district}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">
                                Adres Başlığı
                              </p>
                              <p className="text-xs font-bold text-gray-800 bg-gray-200 px-2 py-0.5 rounded w-max">
                                {addr.addressTitle}
                              </p>
                            </div>

                            <div className="col-span-2 bg-white p-3 rounded-lg border border-gray-200 mt-1">
                              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">
                                Açık Adres ({addr.neighborhood})
                              </p>
                              <p className="text-xs font-medium text-gray-700 leading-relaxed">
                                {addr.fullAddress}
                              </p>
                            </div>
                          </div>
                        );
                      } catch {
                        return (
                          <p className="text-sm font-medium text-black leading-relaxed">
                            {order.shipping_address}
                          </p>
                        );
                      }
                    })()}
                  </div>

                  {/* STATUS */}
                  <div className="flex items-center gap-4 pt-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Sipariş Durumu:
                    </p>

                    <select
                      value={order.status}
                      onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                      className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg border outline-none cursor-pointer transition-colors ${
                        order.status === "Bekliyor"
                          ? "bg-orange-50 text-orange-600 border-orange-200"
                          : order.status === "Hazırlanıyor"
                          ? "bg-blue-50 text-blue-600 border-blue-200"
                          : "bg-green-50 text-green-600 border-green-200"
                      }`}
                    >
                      <option value="Bekliyor">⏳ Bekliyor</option>
                      <option value="Hazırlanıyor">📦 Hazırlanıyor</option>
                      <option value="Kargolandı">🚀 Kargolandı</option>
                    </select>
                  </div>
                </div>

                {/* RIGHT: SUMMARY */}
                <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">
                    Sipariş Özeti
                  </p>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-40">
                    {(order.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <img
                          src={item.images?.[0] || item.image || "/logo.jpeg"}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white"
                          alt=""
                        />
                        <div className="flex-1">
                          <p className="text-[9px] font-bold uppercase truncate text-black">
                            {item.name}
                          </p>
                          <p className="text-[9px] font-black text-gray-500">
                            {item.quantity} Adet
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-gray-200 pt-3 flex justify-between items-end">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Ödenen Tutar
                    </span>
                    <span className="text-lg font-black text-black">
                      {Number(order.total_amount).toLocaleString("tr-TR")} ₺
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}