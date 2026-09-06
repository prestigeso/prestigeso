"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { OrderRow } from "../types";
import { adminDb } from "../adminDb";
import { useAppAlert } from "@/context/AppAlertContext";
import { formatMoney, getErrorMessage, safeParseAddress } from "@/lib/utils";
import {
  getOrderAddressLine as getAddressLine,
  getOrderCouponInfo as getCouponInfo,
  getOrderCustomerName as getCustomerName,
  getOrderItemsSubtotal as getItemsSubtotal,
  getOrderLocationLine as getLocationLine,
  parseOrderItems as safeParseItems,
} from "@/lib/orders/orderPresentation";
import AdminPagination from "../parts/AdminPagination";
import {
  approveReturnWithConfirmation,
  confirmFinancialStatusChange,
  getReviewableReturnRequest,
} from "@/lib/orders/returnApproval";
import { calculateReturnRefundAmount } from "@/lib/returns/refundAmount";

type Props = {
  open: boolean;
  onClose: () => void;
  orders: OrderRow[];
  onUpdateStatus: (orderId: number, newStatus: string) => void | Promise<void>;
  onReturnDecision: (
    orderId: number,
    decision: "approve" | "reject",
    note: string,
    returnShippingCode?: string,
  ) => void | Promise<void>;
  onShippingSaved: (
    orderId: number,
    carrier: string,
    trackingNumber: string,
  ) => void;
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPageChange: (page: number) => void;
};

function getStatusClass(status: string) {
  if (status === "Bekliyor")
    return "bg-orange-50 text-orange-600 border-orange-200";
  if (status === "Hazırlanıyor")
    return "bg-blue-50 text-blue-600 border-blue-200";
  if (status === "Teslim Edildi")
    return "bg-green-50 text-green-600 border-green-200";
  if (status === "İptal Edildi") return "bg-red-50 text-red-600 border-red-200";
  if (status === "İade Talebi")
    return "bg-yellow-50 text-yellow-600 border-yellow-200";
  if (status === "İade Edildi")
    return "bg-purple-50 text-purple-600 border-purple-200";
  return "bg-black text-white border-black";
}

function getCouponDiscountLabel(couponInfo: ReturnType<typeof getCouponInfo>) {
  if (!couponInfo) return "";

  if (couponInfo.discountType === "percent") {
    return `%${formatMoney(couponInfo.discountValue)} indirim`;
  }

  return `${formatMoney(couponInfo.discountValue)} TL indirim`;
}

export default function OrdersModal({
  open,
  onClose,
  orders,
  onUpdateStatus,
  onReturnDecision,
  onShippingSaved,
  page,
  pageSize,
  total,
  loading,
  onPageChange,
}: Props) {
  const { showToast } = useAppAlert();

  const [editingShippingId, setEditingShippingId] = useState<number | null>(
    null,
  );
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<number | null>(null);
  const [reconcilingId, setReconcilingId] = useState<number | null>(null);
  const financialActionRef = useRef<number | null>(null);
  const [financialActionId, setFinancialActionId] = useState<number | null>(null);

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
      const { error } = await adminDb({
        action: "update",
        table: "orders",
        data: {
          shipping_carrier: cleanCarrier,
          tracking_number: cleanTrackingNo,
          status: "Kargolandı",
        },
        filters: [{ column: "id", op: "eq", value: orderId }],
      });

      if (error) throw new Error(error);

      showToast("Kargo bilgileri başarıyla kaydedildi.", "success");
      onShippingSaved(orderId, cleanCarrier, cleanTrackingNo);
      resetShippingForm();
    } catch (error: unknown) {
      showToast("Hata oluştu: " + getErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendInvoice = async (
    orderId: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    try {
      setSendingInvoiceId(orderId);

      const shipping =
        typeof order.shipping_address === "string"
          ? JSON.parse(order.shipping_address)
          : order.shipping_address;

      const email = shipping?.email;
      const customerName =
        `${shipping?.firstName || ""} ${shipping?.lastName || ""}`.trim();

      if (!email) {
        showToast("Müşterinin e-posta adresi bulunamadı.", "error");
        return;
      }

      const formData = new FormData();
      formData.append("orderId", String(orderId));
      formData.append("email", email);
      formData.append("customerName", customerName);
      formData.append("invoice", file);

      const res = await fetch("/api/admin/orders/invoice", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Fatura gönderilemedi");
      }

      showToast("Fatura başarıyla e-posta olarak gönderildi.", "success");
    } catch (error: unknown) {
      showToast(getErrorMessage(error, "Fatura gönderilemedi."), "error");
    } finally {
      e.target.value = "";
      setSendingInvoiceId(null);
    }
  };

  const handleReconcile = async (orderId: number) => {
    setReconcilingId(orderId);
    try {
      const response = await fetch("/api/admin/reconciliation", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Mutabakat yapılamadı.");
      showToast(
        result.status === "matched"
          ? "PayTR ve yerel sipariş tutarları eşleşiyor."
          : "PayTR ile yerel kayıt arasında fark bulundu.",
        result.status === "matched" ? "success" : "warning",
      );
    } catch (error) {
      showToast(getErrorMessage(error, "Mutabakat yapılamadı."), "error");
    } finally {
      setReconcilingId(null);
    }
  };

  const handleStatusChange = async (order: OrderRow, newStatus: string) => {
    if (financialActionRef.current !== null) return;
    if (getReviewableReturnRequest(order.return_requests)?.status === "approved") {
      showToast("İade işlemi başlatılmış. Yeni bir işlem yapmadan önce PayTR mutabakatını kontrol edin.", "warning");
      return;
    }
    const approved = confirmFinancialStatusChange(
      newStatus,
      [
        `Sipariş: ${order.order_no || `PRS-ESKI-${order.id}`}`,
        `Sipariş için ödenen toplam: ${formatMoney(order.total_amount)} TL`,
        `Yeni durum: ${newStatus}`,
        "Bu seçim yalnızca durum etiketini değiştirmez; PayTR üzerinden gerçek para iadesi başlatır ve sipariş stoğunu geri ekler.",
        "İade uygunluğu ve tutarı sunucuda yeniden doğrulanacaktır. Devam etmek istiyor musunuz?",
      ].join("\n\n"),
      (message) => window.confirm(message),
    );
    if (!approved) return;

    financialActionRef.current = order.id;
    setFinancialActionId(order.id);
    try {
      await onUpdateStatus(order.id, newStatus);
    } catch (error) {
      showToast(getErrorMessage(error, "Sipariş durumu güncellenemedi."), "error");
    } finally {
      financialActionRef.current = null;
      setFinancialActionId(null);
    }
  };

  const handleReturnApproval = async (order: OrderRow) => {
    if (financialActionRef.current !== null) return;
    financialActionRef.current = order.id;
    setFinancialActionId(order.id);
    try {
      const request = getReviewableReturnRequest(order.return_requests);
      if (!request || request.status !== "pending")
        throw new Error("Onaylanabilir bekleyen iade talebi bulunamadı. Siparişleri yenileyin; başlatılmış iadeyi tekrar göndermeyin.");
      // Use the server's calculation rules; invalid or stale item data must never open an approval.
      const refundAmount = calculateReturnRefundAmount({
        orderItems: order.items,
        returnItems: request.items,
        totalAmount: order.total_amount,
      });
      const orderItems = safeParseItems(order.items);
      const requestedItems = safeParseItems(request.items);
      const itemLines = requestedItems.map((item) => {
        const source = orderItems.find(
          (candidate) =>
            Number(candidate.id) === Number(item.id) &&
            Number(candidate.variant_id || 0) === Number(item.variant_id || 0),
        );
        const variant = source?.variant_sku || (item.variant_id ? `Varyant #${item.variant_id}` : "");
        return `- ${source?.name || `Ürün #${item.id}`}${variant ? ` (${variant})` : ""}: ${item.quantity} adet`;
      });
      const quantity = requestedItems.reduce((sum, item) => sum + Number(item.quantity), 0);
      const summary = [
        `Sipariş: ${order.order_no || `PRS-ESKI-${order.id}`}`,
        `İade talebi: #${request.id}`,
        `İade tutarı: ${formatMoney(refundAmount)} TL`,
        `İade edilecek ürünler:\n${itemLines.join("\n")}`,
        `Bu işlem PayTR üzerinden gerçek para iadesi başlatır. Talepteki ${quantity} adet ürün stoklara geri eklenecektir.`,
        "Ürünlerin teslim alındığını ve stoklara geri eklenmeye uygun olduğunu kontrol edin. İade uygunluğu ve tutarı sunucuda yeniden doğrulanacaktır.",
        "Para iadesini şimdi başlatmak istiyor musunuz?",
      ].join("\n\n");
      await approveReturnWithConfirmation(
        summary,
        {
          prompt: (message) => window.prompt(message),
          confirm: (message) => window.confirm(message),
        },
        ({ note, returnShippingCode }) =>
          onReturnDecision(order.id, "approve", note, returnShippingCode),
      );
    } catch (error) {
      showToast(getErrorMessage(error, "İade kararı uygulanamadı."), "error");
    } finally {
      financialActionRef.current = null;
      setFinancialActionId(null);
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
          {loading && (
            <p className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
              Siparişler yükleniyor...
            </p>
          )}
          {!orders || orders.length === 0 ? (
            <p className="text-center text-gray-400 font-bold py-20 uppercase tracking-widest text-sm">
              Sistemde henüz sipariş yok.
            </p>
          ) : (
            orders.map((order) => {
              const parsedAddress = safeParseAddress(order.shipping_address);
              const safeItems = safeParseItems(order.items);
              const couponInfo = getCouponInfo(parsedAddress);
              const itemsSubtotal = getItemsSubtotal(safeItems);
              const subtotalAmount =
                couponInfo?.subtotalAmount || itemsSubtotal;
              const paidAmount = Number(
                order.total_amount || couponInfo?.totalAfterDiscount || 0,
              );
              const returnRequest = getReviewableReturnRequest(order.return_requests);
              const returnNeedsReconciliation = returnRequest?.status === "approved";

              return (
                <div
                  key={order.id}
                  className="p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 bg-white transition-all hover:border-black"
                >
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-50 pb-3 gap-4">
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
                        <p className="font-bold text-sm text-black break-all">
                          {order.user_email || "Bilinmeyen müşteri"}
                        </p>
                      </div>

                      <div className="md:text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Tarih
                        </p>
                        <p
                          suppressHydrationWarning
                          className="text-xs font-bold text-gray-600"
                        >
                          {order.created_at
                            ? new Date(order.created_at).toLocaleString("tr-TR")
                            : "Bilinmiyor"}
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
                              <p className="text-[9px] font-bold text-gray-400 uppercase">
                                Alıcı Kişi
                              </p>
                              <p className="text-xs font-black text-black">
                                {getCustomerName(parsedAddress)}
                              </p>
                            </div>

                            <div>
                              <p className="text-[9px] font-bold text-gray-400 uppercase">
                                Telefon
                              </p>
                              <p className="text-xs font-black text-blue-600">
                                {String(parsedAddress.phone || "Belirtilmedi")}
                              </p>
                            </div>

                            <div className="col-span-2 bg-white p-2 rounded-lg border border-gray-200">
                              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">
                                Açık Adres
                              </p>
                              <p className="text-xs font-medium text-gray-700 leading-relaxed">
                                {getAddressLine(parsedAddress)}
                              </p>
                            </div>

                            <div className="col-span-2">
                              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">
                                Bölge
                              </p>
                              <p className="text-xs font-black text-gray-700">
                                {getLocationLine(parsedAddress)}
                              </p>
                            </div>

                            {Boolean(parsedAddress.email) && (
                              <div className="col-span-2">
                                <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">
                                  E-posta
                                </p>
                                <p className="text-xs font-bold text-gray-600 break-all">
                                  {String(parsedAddress.email)}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-black leading-relaxed">
                            {getAddressLine(parsedAddress)}
                          </p>
                        )}
                      </div>

                      <div className="w-full md:w-1/2 flex flex-col gap-3">
                        <div className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            Durum:
                          </p>

                          <select
                            value={order.status || "Bekliyor"}
                            disabled={financialActionId !== null || returnNeedsReconciliation}
                            onChange={(e) =>
                              void handleStatusChange(order, e.target.value)
                            }
                            className={`text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${getStatusClass(order.status)}`}
                          >
                            <option value="Bekliyor">⏳ Bekliyor</option>
                            <option value="Hazırlanıyor">
                              📦 Hazırlanıyor
                            </option>
                            <option value="Kargolandı">🚀 Kargolandı</option>
                            <option value="Teslim Edildi">
                              ✅ Teslim Edildi
                            </option>
                            <option value="İptal Edildi">
                              ❌ İptal Edildi
                            </option>
                            <option value="İade Talebi">🔄 İade Talebi</option>
                            <option value="İade Edildi">🔙 İade Edildi</option>
                          </select>
                        </div>

                        {(order.status === "İade Talebi" || returnNeedsReconciliation) && (
                          <div className="space-y-2 rounded-xl border border-orange-200 bg-orange-50 p-3">
                            {returnRequest && (
                              <div className="space-y-2 text-xs">
                                <p><strong>İade sebebi:</strong> {returnRequest.reason}</p>
                                {Array.isArray(returnRequest.evidence_urls) && returnRequest.evidence_urls.length > 0 && (
                                  <div className="flex flex-wrap gap-2">
                                    {returnRequest.evidence_urls.map((url, index) => (
                                      <a key={String(url)} href={`/api/admin/return-evidence?path=${encodeURIComponent(String(url))}`} target="_blank" rel="noreferrer" className="font-bold underline">
                                        Görsel {index + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            {returnNeedsReconciliation ? (
                              <p role="status" className="text-xs font-bold leading-relaxed text-orange-900">
                                İade işlemi başlatılmış; işlem sürüyor veya sonuç doğrulanmayı bekliyor.
                                Yeniden iade başlatmayın. Aşağıdaki “PayTR ile doğrula” düğmesiyle
                                mutabakatı kontrol edin; sonuç kesinleşmeden yeni karar vermeyin.
                              </p>
                            ) : returnRequest?.status === "pending" ? (
                            <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={financialActionId !== null}
                              onClick={() => void handleReturnApproval(order)}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-50"
                            >
                              {financialActionId === order.id ? "İşleniyor..." : "İadeyi onayla"}
                            </button>
                            <button
                              type="button"
                              disabled={financialActionId !== null}
                              onClick={() => {
                                const note = prompt("Ret sebebini yazın:")?.trim();
                                if (note) onReturnDecision(order.id, "reject", note);
                              }}
                              className="rounded-xl bg-red-600 px-3 py-2 text-[10px] font-black uppercase text-white"
                            >
                              Talebi reddet
                            </button>
                            </div>
                            ) : (
                              <p role="status" className="text-xs font-bold text-orange-900">
                                Onaylanabilir bekleyen iade talebi bulunamadı. Güncel durum için siparişleri yenileyin.
                              </p>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={reconcilingId === order.id}
                          onClick={() => void handleReconcile(order.id)}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-[10px] font-black uppercase disabled:opacity-50"
                        >
                          {reconcilingId === order.id
                            ? "PayTR kontrol ediliyor..."
                            : "PayTR ile doğrula"}
                        </button>

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
                              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                Kargo Bilgisi
                              </p>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingShippingId(order.id);
                                  setCarrier(order.shipping_carrier || "");
                                  setTrackingNo(order.tracking_number || "");
                                }}
                                className="text-[10px] font-bold text-blue-600 hover:underline"
                              >
                                {order.tracking_number
                                  ? "Düzenle"
                                  : "+ Kargo Gir"}
                              </button>
                            </div>

                            {order.tracking_number ? (
                              <div>
                                <p className="text-xs font-bold text-black">
                                  {order.shipping_carrier ||
                                    "Kargo firması belirtilmedi"}
                                </p>
                                <p className="text-[10px] font-mono text-gray-500 break-all">
                                  {order.tracking_number}
                                </p>
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-400 font-medium italic">
                                Kargo bilgisi girilmedi.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl mt-3 flex flex-col gap-2">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            E-Fatura Gönderimi
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept=".pdf"
                              id={`invoice-upload-${order.id}`}
                              className="hidden"
                              onChange={(e) => handleSendInvoice(order.id, e)}
                              disabled={sendingInvoiceId === order.id}
                            />
                            <label
                              htmlFor={`invoice-upload-${order.id}`}
                              className={`flex-1 text-center py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer border border-blue-600 ${
                                sendingInvoiceId === order.id
                                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                  : "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                              }`}
                            >
                              {sendingInvoiceId === order.id
                                ? "Gönderiliyor..."
                                : "PDF Fatura Yükle & Gönder"}
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full md:w-1/3 bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-200 pb-2">
                      Sipariş Özeti
                    </p>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-48 scrollbar-hide">
                      {safeItems.length === 0 ? (
                        <p className="text-xs font-bold text-gray-400 text-center py-6">
                          Ürün bilgisi bulunamadı.
                        </p>
                      ) : (
                        safeItems.map((item, idx) => {
                          const displayImage =
                            item.images?.[0] || item.image || "/logo.jpeg";
                          const quantity = item.quantity || 1;
                          const price = Number(item.price || 0);

                          return (
                            <div key={idx} className="flex gap-3 items-center">
                              <Image
                                width={40}
                                height={40}
                                src={displayImage}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white flex-shrink-0"
                                alt={item.name || "Ürün"}
                              />

                              <div className="flex-1 overflow-hidden">
                                <p className="text-[9px] font-bold uppercase truncate text-black">
                                  {item.name || "Bilinmeyen Ürün"}
                                </p>
                                <p className="text-[9px] font-black text-gray-500 mt-0.5">
                                  {quantity} Adet x{" "}
                                  {price.toLocaleString("tr-TR")} ₺
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="mt-4 border-t border-gray-200 pt-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Ara Toplam
                        </span>
                        <span className="text-xs font-black text-gray-700">
                          {formatMoney(subtotalAmount)} ₺
                        </span>
                      </div>

                      {couponInfo && (
                        <div className="flex justify-between items-center bg-emerald-50 border border-emerald-100 rounded-xl p-2">
                          <div>
                            <span className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                              Kupon
                            </span>
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
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          Ödenen Tutar
                        </span>

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
        <AdminPagination
          page={page}
          pageSize={pageSize}
          total={total}
          loading={loading}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
}
