"use client";

type AdminRecentOrdersProps = {
  orders: any[];
  onOpenOrders: () => void;
};

function formatMoney(value: any) {
  return Number(value || 0).toLocaleString("tr-TR") + " ₺";
}

function formatDate(value: any) {
  if (!value) return "Tarih yok";

  try {
    return new Date(value).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Tarih yok";
  }
}

function getOrderTotal(order: any) {
  return (
    order?.final_total ??
    order?.finalTotal ??
    order?.total_amount ??
    order?.totalAmount ??
    order?.total ??
    order?.amount ??
    order?.cart_total ??
    order?.cartTotal ??
    0
  );
}

function getOrderStatus(order: any) {
  return (order?.status || order?.order_status || order?.orderStatus || "Yeni").toString();
}

function getStatusClassName(status: string) {
  const normalized = status.toLocaleLowerCase("tr-TR");

  if (normalized.includes("teslim") || normalized.includes("tamam")) {
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
  }

  if (normalized.includes("iptal") || normalized.includes("iade")) {
    return "bg-red-50 text-red-600 border-red-100";
  }

  if (normalized.includes("kargo") || normalized.includes("hazırl")) {
    return "bg-blue-50 text-blue-600 border-blue-100";
  }

  return "bg-gray-50 text-gray-600 border-gray-100";
}

export default function AdminRecentOrders({ orders, onOpenOrders }: AdminRecentOrdersProps) {
  const recentOrders = [...(orders || [])]
    .sort((a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
    .slice(0, 5);

  return (
    <section className="bg-white border border-gray-100 rounded-3xl shadow-sm p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Sipariş Akışı
          </p>
          <h2 className="text-lg md:text-xl font-black text-black uppercase tracking-tight">
            Son Siparişler
          </h2>
        </div>

        <button
          type="button"
          onClick={onOpenOrders}
          className="w-full sm:w-auto bg-black text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-[0.98] transition-all"
        >
          Tüm Siparişleri Aç
        </button>
      </div>

      {recentOrders.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-5 text-center">
          <p className="text-xs font-bold text-gray-400">Henüz görüntülenecek sipariş bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recentOrders.map((order: any, index: number) => {
            const status = getOrderStatus(order);
            const orderCode = order?.merchant_oid || order?.order_no || order?.orderNo || order?.id || `S-${index + 1}`;
            const email = order?.user_email || order?.email || order?.customer_email || order?.customerEmail || "E-posta yok";
            const total = getOrderTotal(order);

            return (
              <button
                key={`${order?.id || orderCode}-${index}`}
                type="button"
                onClick={onOpenOrders}
                className="w-full text-left rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-black p-4 transition-all active:scale-[0.99]"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Sipariş
                      </span>
                      <span className="text-xs font-black text-black truncate">#{orderCode}</span>
                    </div>
                    <p className="text-sm font-black text-black truncate">{email}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">
                      {formatDate(order?.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    <span className={`px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${getStatusClassName(status)}`}>
                      {status}
                    </span>
                    <span className="text-sm font-black text-black min-w-max">{formatMoney(total)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
