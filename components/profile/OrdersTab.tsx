"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Order } from "@/types";
import { supabase } from "@/lib/supabase";
import { safeParseAddress } from "@/lib/utils";
import {
  formatOrderAddress as formatAddress,
  getOrderCouponInfo as getCouponInfo,
  getOrderItemsSubtotal as getItemsSubtotal,
  parseOrderItems as safeParseItems,
} from "@/lib/orders/orderPresentation";

export default function OrdersTab({
  orders,
  onOrderAction,
}: {
  orders: Order[];
  onOrderAction?: (
    id: number,
    action: "cancel" | "return",
    details?: {
      reason: string;
      items: Array<{ id: number; variant_id?: number; quantity: number }>;
      evidenceUrls?: string[];
    },
  ) => void | boolean | Promise<void | boolean>;
}) {
  const [returnOrder, setReturnOrder] = useState<{
    id: number;
    items: Array<{
      lineId: string;
      id: number;
      variant_id?: number;
      name: string;
      quantity: number;
    }>;
  } | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnFiles, setReturnFiles] = useState<File[]>([]);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState("");

  const closeReturnDialog = () => {
    setReturnOrder(null);
    setReturnReason("");
    setReturnQuantities({});
    setReturnFiles([]);
    setReturnError("");
  };

  const submitReturn = async () => {
    if (!returnOrder || !onOrderAction || returnReason.trim().length < 5) return;
    const items = returnOrder.items
      .map((item) => ({
        id: item.id,
        ...(item.variant_id ? { variant_id: item.variant_id } : {}),
        quantity: returnQuantities[item.lineId] || 0,
      }))
      .filter((item) => item.quantity > 0);
    if (items.length === 0) return;
    setReturnSubmitting(true);
    setReturnError("");
    let evidenceUrls: string[] = [];
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) throw new Error("Oturum bulunamadı.");
      if (returnFiles.length > 0) {
        const form = new FormData();
        form.set("orderId", String(returnOrder.id));
        returnFiles.forEach((file) => form.append("files", file));
        const upload = await fetch("/api/orders/return-evidence", {
          method: "POST",
          headers: { Authorization: `Bearer ${data.session.access_token}` },
          body: form,
        });
        const uploadResult = await upload.json();
        if (!upload.ok) throw new Error(uploadResult.error || "Görseller yüklenemedi.");
        evidenceUrls = Array.isArray(uploadResult.urls) ? uploadResult.urls : [];
      }
      const succeeded = await onOrderAction(returnOrder.id, "return", {
        reason: returnReason.trim(),
        items,
        evidenceUrls,
      });
      if (succeeded === false) {
        if (evidenceUrls.length > 0)
          await fetch("/api/orders/return-evidence", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ orderId: returnOrder.id, urls: evidenceUrls }),
          }).catch(() => undefined);
        return;
      }
      closeReturnDialog();
    } catch (error) {
      if (evidenceUrls.length > 0) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token)
          await fetch("/api/orders/return-evidence", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${data.session.access_token}`,
            },
            body: JSON.stringify({ orderId: returnOrder?.id, urls: evidenceUrls }),
          }).catch(() => undefined);
      }
      setReturnError(
        error instanceof Error ? error.message : "İade talebi gönderilemedi.",
      );
    } finally {
      setReturnSubmitting(false);
    }
  };
  const formatMoney = (value: unknown) => {
    return Number(value || 0).toLocaleString("tr-TR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  const getCouponDiscountLabel = (
    couponInfo: ReturnType<typeof getCouponInfo>,
  ) => {
    if (!couponInfo) return "";

    if (couponInfo.discountType === "percent") {
      return `%${formatMoney(couponInfo.discountValue)} indirim`;
    }

    return `${formatMoney(couponInfo.discountValue)} TL indirim`;
  };

  const getStatusClass = (status: string) => {
    if (status === "Bekliyor") return "bg-orange-50 text-orange-600";
    if (status === "Hazırlanıyor") return "bg-blue-50 text-blue-600";
    if (status === "Kargolandı") return "bg-purple-50 text-purple-600";
    if (status === "Teslim Edildi") return "bg-green-50 text-green-600";
    return "bg-gray-50 text-gray-600";
  };

  const getStatusIcon = (status: string) => {
    if (status === "Bekliyor") return "⏳";
    if (status === "Hazırlanıyor") return "📦";
    if (status === "Kargolandı") return "🚀";
    if (status === "Teslim Edildi") return "✅";
    return "⏱️";
  };

  return (
    <div className="animate-in fade-in duration-300">
      <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-black">
        Tüm Siparişlerim
      </h3>

      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6 border-b-2 border-gray-50 pb-4">
        * İade ve iptal talepleriniz için destek mesajı gönderebilirsiniz.
      </p>

      {!orders || orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
          <span className="text-4xl mb-4 opacity-50">📦</span>

          <p className="text-gray-400 font-black uppercase tracking-widest text-xs">
            Henüz bir siparişiniz bulunmuyor.
          </p>

          <Link
            href="/"
            className="mt-6 bg-black text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all shadow-md"
          >
            Alışverişe Başla
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order, index) => {
            const safeItems = safeParseItems(order.items);
            const parsedAddress = safeParseAddress(order.shipping_address);
            const couponInfo = getCouponInfo(parsedAddress);
            const status = order.status || "İşleniyor";
            const itemsSubtotal = getItemsSubtotal(safeItems);
            const subtotalAmount = couponInfo?.subtotalAmount || itemsSubtotal;
            const paidAmount = Number(
              order.total_amount || couponInfo?.totalAfterDiscount || 0,
            );

            return (
              <div
                key={order.id || index}
                className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col gap-4 hover:border-black transition-all"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-50 pb-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Sipariş No:
                      </p>

                      <span className="bg-gray-100 text-black px-2 py-0.5 rounded text-[10px] font-black tracking-widest font-mono">
                        {order.order_no || `PRS-ESKI-${order.id || "000"}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Tarih:
                      </p>

                      <p
                        suppressHydrationWarning
                        className="text-xs font-bold text-black"
                      >
                        {order.created_at
                          ? new Date(order.created_at).toLocaleDateString(
                              "tr-TR",
                            )
                          : "Bilinmiyor"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${getStatusClass(
                        status,
                      )}`}
                    >
                      <span
                        className={status === "Bekliyor" ? "animate-pulse" : ""}
                      >
                        {getStatusIcon(status)}
                      </span>
                      {status}
                    </span>

                    {onOrderAction &&
                      (status === "İşleniyor" || status === "Bekliyor") && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                "Bu siparişi iptal etmek istediğinize emin misiniz?",
                              )
                            ) {
                              onOrderAction(order.id, "cancel");
                            }
                          }}
                          className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-700 underline"
                        >
                          Siparişi İptal Et
                        </button>
                      )}

                    {onOrderAction &&
                      (status === "Teslim Edildi" ||
                        status === "Tamamlandı") && (
                        <button
                          onClick={() => {
                            const items = safeItems
                              .map((item) => ({
                                id: Number(item.id),
                                ...(item.variant_id
                                  ? { variant_id: Number(item.variant_id) }
                                  : {}),
                                lineId: `${Number(item.id)}:${Number(item.variant_id || 0)}`,
                                name: String(item.name || "Ürün"),
                                quantity: Number(item.quantity),
                              }))
                              .filter(
                                (item) =>
                                  Number.isSafeInteger(item.id) &&
                                  item.id > 0 &&
                                  Number.isSafeInteger(item.quantity) &&
                                  item.quantity > 0,
                              );
                            setReturnQuantities(
                              Object.fromEntries(
                                items.map((item) => [item.lineId, item.quantity]),
                              ),
                            );
                            setReturnOrder({ id: order.id, items });
                          }}
                          className="mt-2 text-[10px] font-bold text-orange-500 hover:text-orange-700 underline"
                        >
                          İade Talebi Oluştur
                        </button>
                      )}
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
                        Sağlanan İndirim
                      </p>
                      <p className="text-base font-black text-emerald-700 mt-1">
                        -{formatMoney(couponInfo.discountAmount)} ₺
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Ürünler
                    </p>

                    {safeItems.length === 0 ? (
                      <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
                        <p className="text-xs font-bold text-gray-400 text-center">
                          Ürün bilgisi bulunamadı.
                        </p>
                      </div>
                    ) : (
                      safeItems.map((item, idx) => {
                        const displayImage =
                          item.images?.[0] || item.image || "/logo.jpeg";

                        const itemPrice =
                          Number(item.discount_price) > 0
                            ? Number(item.discount_price)
                            : Number(item.price || 0);

                        return (
                          <div
                            key={idx}
                            className="flex gap-4 items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-50"
                          >
                            <Image
                              width={64}
                              height={64}
                              src={displayImage}
                              alt={item.name || "Ürün"}
                              className="w-14 h-14 object-cover rounded-xl border border-gray-100 bg-white"
                            />

                            <div className="min-w-0">
                              <Link
                                href={`/product/${item.id}`}
                                className="text-xs font-bold uppercase text-black line-clamp-1 hover:underline"
                              >
                                {item.name || "Bilinmeyen Ürün"}
                              </Link>

                              <p className="text-[10px] font-black text-gray-500 mt-0.5">
                                {item.quantity || 1} Adet x{" "}
                                {itemPrice.toLocaleString("tr-TR")} ₺
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="w-full md:w-1/3 bg-gray-50 rounded-2xl p-5 flex flex-col justify-between border border-gray-100">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Teslimat Adresi
                      </p>

                      <p className="text-xs font-medium text-gray-700 line-clamp-3">
                        {formatAddress(order.shipping_address)}
                      </p>
                    </div>

                    {(order.shipping_carrier || order.tracking_number) && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Kargo Bilgisi
                        </p>

                        <p className="text-xs font-bold text-black">
                          {order.shipping_carrier ||
                            "Kargo Firması Belirtilmedi"}
                        </p>

                        <p className="text-[11px] font-mono text-gray-500 break-all mt-1">
                          {order.tracking_number || "Takip numarası yok"}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Ara Toplam
                        </p>
                        <p className="text-xs font-black text-gray-700">
                          {formatMoney(subtotalAmount)} ₺
                        </p>
                      </div>

                      {couponInfo && (
                        <div className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-2">
                          <div>
                            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                              Kupon
                            </p>
                            <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mt-0.5">
                              {couponInfo.code}
                            </p>
                          </div>
                          <p className="text-xs font-black text-emerald-700">
                            -{formatMoney(couponInfo.discountAmount)} ₺
                          </p>
                        </div>
                      )}

                      <div className="pt-2 border-t border-gray-200">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Toplam Ödenen
                        </p>

                        <p className="text-2xl font-black text-black">
                          {formatMoney(paidAmount)} ₺
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {returnOrder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h4 className="text-lg font-black uppercase">İade talebi</h4>
              <button type="button" onClick={closeReturnDialog} aria-label="Kapat">
                ✕
              </button>
            </div>
            <div className="space-y-3">
              {returnOrder.items.map((item) => (
                <label key={item.lineId} className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 p-3 text-sm font-bold">
                  <span className="min-w-0 truncate">{item.name}</span>
                  <input
                    type="number"
                    min="0"
                    max={item.quantity}
                    value={returnQuantities[item.lineId] || 0}
                    onChange={(event) =>
                      setReturnQuantities((current) => ({
                        ...current,
                        [item.lineId]: Math.min(
                          item.quantity,
                          Math.max(0, Math.floor(Number(event.target.value) || 0)),
                        ),
                      }))
                    }
                    className="w-20 rounded-lg border border-gray-200 px-3 py-2"
                    aria-label={`${item.name} iade adedi`}
                  />
                </label>
              ))}
              <textarea
                value={returnReason}
                onChange={(event) => setReturnReason(event.target.value.slice(0, 1000))}
                rows={4}
                placeholder="İade sebebinizi yazın (en az 5 karakter)"
                className="w-full rounded-xl border border-gray-200 p-3 text-sm"
              />
              <label className="block text-xs font-bold text-gray-600">
                Fotoğraf (isteğe bağlı, en fazla 3 adet / 5 MB)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  multiple
                  onChange={(event) =>
                    setReturnFiles(Array.from(event.target.files || []).slice(0, 3))
                  }
                  className="mt-2 block w-full text-xs"
                />
              </label>
              {returnError && <p className="text-xs font-bold text-red-600">{returnError}</p>}
              <button
                type="button"
                disabled={
                  returnSubmitting ||
                  returnReason.trim().length < 5 ||
                  !Object.values(returnQuantities).some((quantity) => quantity > 0)
                }
                onClick={() => void submitReturn()}
                className="w-full rounded-xl bg-black py-3 text-xs font-black uppercase text-white disabled:opacity-40"
              >
                {returnSubmitting ? "Gönderiliyor..." : "Talebi gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
