"use client";

import { useState } from "react";
import type { OrderRow } from "../types";
import { supabase } from "@/lib/supabase";
import { useAppAlert } from "@/context/AppAlertContext";

type Props = {
  open: boolean;
  onClose: () => void;
  orders: OrderRow[];
  onUpdateStatus: (orderId: number, newStatus: string) => void;
};

function safeParseItems(items: any): any[] {
  try {
    if (Array.isArray(items)) return items;
    if (typeof items === "string") return JSON.parse(items || "[]");
    return [];
  } catch {
    return [];
  }
}

function safeParseAddress(address: any): any {
  try {
    if (!address) return null;
    if (typeof address === "string") return JSON.parse(address);
    if (typeof address === "object") return address;
    return null;
  } catch {
    return address;
  }
}

function getAddressLine(address: any): string {
  if (!address) return "Adres bilgisi yok.";
  if (typeof address === "string") return address;

  if (typeof address === "object") {
    return (
      address.fullAddress ||
      address.full_address ||
      address.address ||
      address.addressLine ||
      address.line ||
      "Açık adres yok."
    );
  }

  return String(address);
}

function getCustomerName(address: any): string {
  if (!address || typeof address !== "object") return "Belirtilmedi";

  const fullName = [address.firstName, address.lastName].filter(Boolean).join(" ");

  return fullName || "Belirtilmedi";
}

function getLocationLine(address: any): string {
  if (!address || typeof address !== "object") return "Belirtilmedi";

  return (
    [address.neighborhood, address.district, address.city]
      .filter(Boolean)
      .join(" / ") || "Belirtilmedi"
  );
}

function getStatusClass(status: string) {
  if (status === "Bekliyor") return "bg-orange-50 text-orange-600 border-orange-200";
  if (status === "Hazırlanıyor") return "bg-blue-50 text-blue-600 border-blue-200";
  if (status === "Teslim Edildi") return "bg-green-50 text-green-600 border-green-200";
  return "bg-black text-white border-black";
}

function formatMoney(value: any) {
  return Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getItemsSubtotal(items: any[]) {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity || 1);
    const price = Number(item.price || 0);

    if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
      return sum;
    }

    return sum + price * quantity;
  }, 0);
}

function getCouponInfo(address: any) {
  if (!address || typeof address !== "object") return null;

  const coupon = address.coupon;

  if (!coupon || typeof coupon !== "object") return null;

  const discountAmount = Number(coupon.discount_amount || 0);

  if (!Number.isFinite(discountAmount) || discountAmount <= 0) return null;

  return {
    id: coupon.id || null,
    code: String(coupon.code || "").toUpperCase(),
    discountType: coupon.discount_type || null,
    discountValue: Number(coupon.discount_value || 0),
    discountAmount,
    subtotalAmount: Number(coupon.subtotal_amount || 0),
    totalAfterDiscount: Number(coupon.total_after_discount || 0),
  };
}

function getCouponDiscountLabel(couponInfo: ReturnType<typeof getCouponInfo>) {
  if (!couponInfo) return "";

  if (couponInfo.discountType === "percent") {
    return `%${formatMoney(couponInfo.discountValue)} indirim`;
  }

  return `${formatMoney(couponInfo.discountValue)} TL indirim`;
}

export default function OrdersModal({ open, onClose, orders, onUpdateStatus }: Props) {
  const { showToast } = useAppAlert();

  const [editingShippingId, setEditingShippingId] = useState<number | null>(null);
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!open) return null;

  const resetShippingForm = () => {
    setEditingShippingId(null);
    setCarrier("");
    setTrackingNo("");
  };

  const handleClose = () => {
    resetShippingForm();
    onClose();
  };

  const handleSaveShipping = async (orderId: number) => {
    const cleanCarrier = carrier.trim();
    const cleanTrackingNo = trackingNo.trim();

    if (!cleanCarrier) {
      showToast("Lütfen kargo firmasını giriniz.", "warning");
      return;
    }

    if (!cleanTrackingNo) {
      showToast("Lütfen takip numarasını giriniz.", "warning");
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          shipping_carrier: cleanCarrier,
          tracking_number: cleanTrackingNo,
          status: "Kargolandı",
        })
        .eq("id", orderId);

      if (error) throw error;

      showToast("Kargo bilgileri başarıyla kaydedildi.", "success");
      onUpdateStatus(orderId, "Kargolandı");
      resetShippingForm();
    } catch (err: any) {
      showToast("Hata oluştu: " + (err?.message || "Bilinmeyen hata"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl rounded-3xl p-8 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
            <span>📦</span> Sipariş &amp; Kargo Yönetimi
          </h2>

          <button
            type="button"
            onClick={handleClose}
            className="w-10 h-10 bg-gray-100 rounded-full font-bold hover:bg-gray-200 transition-colors"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto space-y-6 flex-1 pr-2">
          {!orders || orders.length === 0 ? (
            <p className="text-center text-gray-400 font-bold py-20 uppercase tracking-widest text-sm">
              Sistemde henüz sipariş yok.
            </p>
          ) : (
            orders.map((order: any) => {
              const parsedAddress = safeParseAddress(order.shipping_address);
              const safeItems = safeParseItems(order.items);
              const couponInfo = getCouponInfo(parsedAddress);
              const itemsSubtotal = getItemsSubtotal(safeItems);
              const subtotalAmount = couponInfo?.subtotalAmount || itemsSubtotal;
              const paidAmount = Number(order.total_amount || couponInfo?.totalAfterDiscount || 0);

              return (
                <div
                  key={order.id}
                  className="p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 bg-white transition-all hover:border-black"
                >
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-50 pb-3 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Sipariş No</p>
                        <p className="font-mono font-bold text-sm bg-gray-100 px-2 py-0.5 rounded text-black w-max">
                          {order.order_no || `PRS-ESKI-${order.id}`}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Müşteri</p>
                        <p className="font-bold text-sm text-black break-all">
                          {order.user_email || "Bilinmeyen müşteri"}
                        </p>
                      </div>

                      <div className="md:text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tarih</p>
                        <p suppressHydrationWarning className="text-xs font-bold text-gray-600">
                          {order.created_at ? new Date(order.created_at).toLocaleString("tr-TR") : "Bilinmiyor"}
                        </p>
                      </div>
                    </div>

                    {couponInfo && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                            Kupon Kullanıldı
                          </p>
                          <p className="text-sm font-black text-black mt-1">
                            {couponInfo.code || "Kupon"}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-700 mt-1">
                            {getCouponDiscountLabel(couponInfo)}
                          </p>
                        </div>

                        <div className="bg-white border border-emerald-100 rounded-xl px-4 py-3 text-right">
                          <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                            İndirim
                          </p>
                          <p className="text-base font-black text-emerald-700 mt-1">
                            -{formatMoney(couponInfo.discountAmount)} ₺
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">
                          Teslimat Detayları
                        </p>

                        {parsedAddress && typeof parsedAddress === "object" ? (
                          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Alıcı Kişi</p>
                              <p className="text-xs font-black text-black">{getCustomerName(parsedAddress)}</p>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">Telefon</p>
                              <p className="text-xs font-black text-blue-600">{parsedAddress.phone || "Belirtilmedi"}</p>
                            </div>

                            <div className="col-span-2 bg-white p-2 rounded-lg border border-gray-200">
                              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Açık Adres</p>
                              <p className="text-xs font-medium text-gray-700 leading-relaxed">{getAddressLine(parsedAddress)}</p>
                            </div>

                            <div className="col-span-2">
                              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">Bölge</p>
                              <p className="text-xs font-black text-gray-700">{getLocationLine(parsedAddress)}</p>
                            </div>

                            {parsedAddress.email && (
                              <div className="col-span-2">
                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">E-posta</p>
                                <p className="text-xs font-bold text-gray-600 break-all">{parsedAddress.email}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-black leading-relaxed">{getAddressLine(parsedAddress)}</p>
                        )}
                      </div>

                      <div className="w-full md:w-1/2 flex flex-col gap-3">
                        <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Durum:</p>

                          <select
                            value={order.status || "Bekliyor"}
                            onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                            className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${getStatusClass(order.status)}`}
                          >
                            <option value="Bekliyor">⏳ Bekliyor</option>
                            <option value="Hazırlanıyor">📦 Hazırlanıyor</option>
                            <option value="Kargolandı">🚀 Kargolandı</option>
                            <option value="Teslim Edildi">✅ Teslim Edildi</option>
                          </select>
                        </div>

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
                              <button
                                type="button"
                                onClick={resetShippingForm}
                                className="flex-1 bg-white text-gray-500 text-[10px] font-black uppercase py-2 rounded-lg border border-gray-200"
                              >
                                İptal
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSaveShipping(order.id)}
                                disabled={isSaving}
                                className="flex-1 bg-blue-600 text-white text-[10px] font-black uppercase py-2 rounded-lg disabled:opacity-50"
                              >
                                {isSaving ? "Kaydediliyor..." : "Kaydet"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Kargo Bilgisi</p>

                              <button
                                type="button"
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
                                <p className="text-xs font-bold text-black">{order.shipping_carrier || "Kargo firması belirtilmedi"}</p>
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

                  <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">
                      Sipariş Özeti
                    </p>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-48 scrollbar-hide">
                      {safeItems.length === 0 ? (
                        <p className="text-xs font-bold text-gray-400 text-center py-6">Ürün bilgisi bulunamadı.</p>
                      ) : (
                        safeItems.map((item: any, idx: number) => {
                          const displayImage = item.images?.[0] || item.image || "/logo.jpeg";
                          const quantity = item.quantity || 1;
                          const price = Number(item.price || 0);

                          return (
                            <div key={idx} className="flex gap-3 items-center">
                              <img
                                src={displayImage}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white flex-shrink-0"
                                alt={item.name || "Ürün"}
                              />

                              <div className="flex-1 overflow-hidden">
                                <p className="text-[9px] font-bold uppercase truncate text-black">{item.name || "Bilinmeyen Ürün"}</p>
                                <p className="text-[9px] font-black text-gray-500 mt-0.5">
                                  {quantity} Adet x {price.toLocaleString("tr-TR")} ₺
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-4 border-t border-gray-200 pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ara Toplam</span>
                        <span className="text-xs font-black text-gray-700">
                          {formatMoney(subtotalAmount)} ₺
                        </span>
                      </div>

                      {couponInfo && (
                        <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 rounded-xl p-2">
                          <div>
                            <span className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest">Kupon</span>
                            <span className="block text-[9px] font-black text-emerald-700 uppercase tracking-widest mt-0.5">
                              {couponInfo.code}
                            </span>
                          </div>
                          <span className="text-xs font-black text-emerald-700">
                            -{formatMoney(couponInfo.discountAmount)} ₺
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-end pt-2 border-t border-gray-200">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ödenen Tutar</span>

                        <span className="text-lg font-black text-black">
                          {formatMoney(paidAmount)} ₺
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
