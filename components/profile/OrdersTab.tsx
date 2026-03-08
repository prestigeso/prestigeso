import Link from "next/link";

export default function OrdersTab({ orders }: { orders: any[] }) {
  // Adres formatlayıcıyı buraya taşıdık (Ana sayfayı kirletmesin)
  const formatAddress = (addr: any) => {
    if (!addr) return "";
    let obj = addr;
    if (typeof addr === "string") {
      try { obj = JSON.parse(addr); } catch { return addr; }
    }
    if (typeof obj === "object") {
      const parts: string[] = [];
      const fullName = [obj.firstName, obj.lastName].filter(Boolean).join(" ");
      if (fullName) parts.push(fullName);
      if (obj.phone) parts.push(obj.phone);
      const line = obj.address || obj.street || obj.addressLine || obj.line || obj.fullAddress || "";
      if (line) parts.push(line);
      const cityLine = [obj.district, obj.city].filter(Boolean).join(" / ");
      if (cityLine) parts.push(cityLine);
      return parts.join(" • ");
    }
    return String(addr);
  };

  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-black">Tüm Siparişlerim</h3>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b-2 border-gray-50 pb-4">
        * İade ve iptal işlemlerinizi sipariş detaylarından gerçekleştirebilirsiniz.
      </p>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-4 opacity-50">📦</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Henüz bir siparişiniz bulunmuyor.</p>
          <Link href="/" className="mt-6 bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
             /* Senin sipariş kartı UI kodlarının tamamı burada olacak */
             <div key={order.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 hover:border-black transition-all">
                {/* O uzun order kartı kodların */}
                <div className="flex justify-between border-b border-gray-50 pb-4">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase">Sipariş No:</p>
                        <p className="text-sm font-bold">{order.order_no}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Tutar:</p>
                        <p className="text-lg font-black">{Number(order.total_amount).toLocaleString('tr-TR')} ₺</p>
                    </div>
                </div>
                {/* Ürünler ve Adres kısmı... */}
             </div>
          ))}
        </div>
      )}
    </div>
  );
}