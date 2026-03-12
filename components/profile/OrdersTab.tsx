import Link from "next/link";

export default function OrdersTab({ orders }: { orders: any[] }) {
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

      {!orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-4 opacity-50">📦</span>
          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Henüz bir siparişiniz bulunmuyor.</p>
          <Link href="/" className="mt-6 bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md">
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            // Veri güvenlik zırhı (Sipariş detayları gelmezse çökmeyi önler)
            const safeItems = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items || "[]") : []);
            
            return (
             <div key={order.id || Math.random()} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 hover:border-black transition-all">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-50 pb-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sipariş No:</p>
                      <span className="bg-gray-100 text-black px-2 py-0.5 rounded text-[10px] font-black tracking-widest font-mono">
                        {order.order_no || `PRS-ESKI-${order.id || "000"}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarih:</p>
                      {/* suppressHydrationWarning ile tarih çökmelerini engelliyoruz */}
                      <p suppressHydrationWarning className="text-xs font-bold text-black">
                        {order.created_at ? new Date(order.created_at).toLocaleDateString("tr-TR") : "Bilinmiyor"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${order.status === "Bekliyor" ? "bg-orange-50 text-orange-600" : order.status === "Hazırlanıyor" ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"}`}>
                      {order.status === "Bekliyor" && <span className="animate-pulse">⏳</span>}
                      {order.status === "Hazırlanıyor" && <span>📦</span>}
                      {order.status === "Kargolandı" && <span>🚀</span>}
                      {order.status === "Teslim Edildi" && <span>✅</span>}
                      {order.status || "İşleniyor"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Ürünler</p>
                    
                    {safeItems.map((item: any, idx: number) => {
                      const displayImage = item.images?.[0] || item.image || "/logo.jpeg";
                      const itemPrice = Number(item.discount_price) > 0 ? Number(item.discount_price) : Number(item.price);
                      
                      return (
                        <div key={idx} className="flex gap-4 items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-50">
                          <img src={displayImage} alt="" className="w-14 h-14 object-cover rounded-xl border border-gray-100 bg-white" />
                          <div>
                            <Link href={`/product/${item.id}`} className="text-xs font-bold uppercase text-black line-clamp-1 hover:underline">
                              {item.name || "Bilinmeyen Ürün"}
                            </Link>
                            <p className="text-[10px] font-black text-gray-500 mt-0.5">
                              {item.quantity || 1} Adet x {itemPrice ? itemPrice.toLocaleString("tr-TR") : "0"} ₺
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="w-full md:w-1/3 bg-gray-50 rounded-2xl p-5 flex flex-col justify-between border border-gray-100">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Teslimat Adresi</p>
                      <p className="text-xs font-medium text-gray-700 line-clamp-3">{formatAddress(order.shipping_address)}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Toplam Ödenen</p>
                      <p className="text-2xl font-black text-black">
                        {order.total_amount ? Number(order.total_amount).toLocaleString("tr-TR") : "0"} ₺
                      </p>
                    </div>
                  </div>
                </div>

             </div>
            );
          })}
        </div>
      )}
    </div>
  );
}