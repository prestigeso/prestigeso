"use client";

import { useState } from "react";
import type { OrderRow } from "../types";
import { supabase } from "@/lib/supabase"; // Veritabanı bağlantısı kargo kaydetmek için lazım

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
  // Hangi siparişin kargo bilgisinin düzenlendiğini tutar
  const [editingShippingId, setEditingShippingId] = useState<number | null>(null);
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!open) return null;

  // Kargo Bilgilerini Kaydetme Motoru
  const handleSaveShipping = async (orderId: number) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          shipping_carrier: carrier,
          tracking_number: trackingNo,
          status: "Kargolandı" // Kargo girilince otomatik Kargolandı yap
        })
        .eq("id", orderId);

      if (error) throw error;

      alert("Kargo bilgileri başarıyla kaydedildi! Müşteri artık takip edebilir. 🚚");
      
      // Ekranda da durumu anında güncelleyelim
      onUpdateStatus(orderId, "Kargolandı");
      
      setEditingShippingId(null);
      setCarrier("");
      setTrackingNo("");
    } catch (err: any) {
      alert("Hata oluştu: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <span>📦</span> Sipariş & Kargo Yönetimi
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
                className="p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 bg-white transition-all hover:border-black"
              >
                {/* SOL: SİPARİŞ VE KARGO BİLGİLERİ */}
                <div className="flex-1 space-y-4">
                  {/* Üst Başlıklar (Sipariş No ve Tarih) */}
                  <div className="flex justify-between items-start border-b border-gray-50 pb-3">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Sipariş No
                      </p>
                      <p className="font-mono font-bold text-sm bg-gray-100 px-2 py-0.5 rounded text-black w-max">
                        {order.order_no || `PRS-ESKI-${order.id}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Müşteri
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

                  {/* Adres ve Durum Alanı */}
                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Adres Kutusu */}
                    <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">
                        Teslimat Detayları
                      </p>
                      {(() => {
                        try {
                          const addr = JSON.parse(order.shipping_address);
                          return (
                            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Alıcı Kişi</p>
                                <p className="text-xs font-black text-black">{addr.firstName} {addr.lastName}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 uppercase">Telefon</p>
                                <p className="text-xs font-black text-blue-600">{addr.phone}</p>
                              </div>
                              <div className="col-span-2 bg-white p-2 rounded-lg border border-gray-200">
                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Açık Adres ({addr.city}/{addr.district})</p>
                                <p className="text-xs font-medium text-gray-700 leading-relaxed">{addr.fullAddress}</p>
                              </div>
                            </div>
                          );
                        } catch {
                          return <p className="text-sm font-medium text-black leading-relaxed">{order.shipping_address}</p>;
                        }
                      })()}
                    </div>

                    {/* Durum ve Kargo İşlemleri */}
                    <div className="w-full md:w-1/2 flex flex-col gap-3">
                      {/* Durum Değiştirici */}
                      <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Durum:</p>
                        <select
                          value={order.status}
                          onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                          className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${
                            order.status === "Bekliyor" ? "bg-orange-50 text-orange-600 border-orange-200"
                            : order.status === "Hazırlanıyor" ? "bg-blue-50 text-blue-600 border-blue-200"
                            : order.status === "Teslim Edildi" ? "bg-green-50 text-green-600 border-green-200"
                            : "bg-black text-white border-black" // Kargolandı durumu için asil siyah
                          }`}
                        >
                          <option value="Bekliyor">⏳ Bekliyor</option>
                          <option value="Hazırlanıyor">📦 Hazırlanıyor</option>
                          <option value="Kargolandı">🚀 Kargolandı</option>
                          <option value="Teslim Edildi">✅ Teslim Edildi</option>
                        </select>
                      </div>

                      {/* Kargo Girme Motoru */}
                      {editingShippingId === order.id ? (
                        <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 animate-in fade-in flex flex-col gap-2">
                          <input 
                            type="text" 
                            placeholder="Firma (Örn: Yurtiçi, MNG)" 
                            value={carrier} 
                            onChange={(e) => setCarrier(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-blue-200 outline-none"
                          />
                          <input 
                            type="text" 
                            placeholder="Takip Numarası" 
                            value={trackingNo} 
                            onChange={(e) => setTrackingNo(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-blue-200 outline-none font-mono"
                          />
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => setEditingShippingId(null)} className="flex-1 bg-white text-gray-500 text-[10px] font-black uppercase py-2 rounded-lg border border-gray-200">İptal</button>
                            <button onClick={() => handleSaveShipping(order.id)} disabled={isSaving} className="flex-1 bg-blue-600 text-white text-[10px] font-black uppercase py-2 rounded-lg disabled:opacity-50">Kaydet</button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Kargo Bilgisi</p>
                            <button 
                              onClick={() => {
                                setEditingShippingId(order.id);
                                setCarrier(order.shipping_carrier || "");
                                setTrackingNo(order.tracking_number || "");
                              }} 
                              className="text-[10px] font-bold text-blue-600 hover:underline"
                            >
                              {order.tracking_number ? "Düzenle" : "+ Kargo Gir"}
                            </button>
                          </div>
                          
                          {order.tracking_number ? (
                            <div>
                              <p className="text-xs font-bold text-black">{order.shipping_carrier}</p>
                              <p className="text-[10px] font-mono text-gray-500 break-all">{order.tracking_number}</p>
                            </div>
                          ) : (
                            <p className="text-[10px] text-gray-400 font-medium italic">Kargo bilgisi girilmedi.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SAĞ: SİPARİŞ ÖZETİ (Aynı kaldı) */}
                <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">
                    Sipariş Özeti
                  </p>

                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-48 scrollbar-hide">
                    {(order.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <img
                          src={item.images?.[0] || item.image || "/logo.jpeg"}
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white flex-shrink-0"
                          alt=""
                        />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-[9px] font-bold uppercase truncate text-black">
                            {item.name}
                          </p>
                          <p className="text-[9px] font-black text-gray-500 mt-0.5">
                            {item.quantity} Adet x {Number(item.price).toLocaleString("tr-TR")} ₺
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